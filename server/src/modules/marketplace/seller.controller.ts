
import type { Request, Response } from "express";
import mongoose from "mongoose";

import Seller from "./seller.model";
import {
  createSellerSchema,
  updateSellerSchema,
  reviewSellerSchema,
} from "./seller.validation";

import { User } from "../users/user.model";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

const getAuthUser = (res: Response): AuthUser | undefined => {
  return res.locals.authUser as AuthUser | undefined;
};

// ==========================================
// 1. SUBMIT SELLER APPLICATION
// ==========================================

export const submitSellerApplication = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = getAuthUser(res);

    if (!authUser || !authUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "Active authentication required",
      });
    }

    if (authUser.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can apply for seller accounts",
      });
    }

    const parsed = createSellerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const existingSeller = await Seller.findOne({
      user: authUser.id,
    });

    if (existingSeller) {
      return res.status(409).json({
        success: false,
        message: "You already have a seller application",
      });
    }

    const seller = await Seller.create({
      ...parsed.data,
      user: authUser.id,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Seller application submitted successfully",
      seller,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Seller application already exists",
      });
    }

    console.error("Submit seller application error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit seller application",
    });
  }
};

// ==========================================
// 2. GET MY SELLER SHOP
// ==========================================

export const getMySellerShop = async (
  _req: Request,
  res: Response
) => {
  try {
    const authUser = getAuthUser(res);

    if (!authUser || !authUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const seller = await Seller.findOne({
      user: authUser.id,
    }).populate("user", "name email");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller application not found",
      });
    }

    return res.status(200).json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error("Get seller shop error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve seller shop",
    });
  }
};

// ==========================================
// 3. UPDATE MY SELLER SHOP
// ==========================================

export const updateMySellerShop = async (
  req: Request,
  res: Response
) => {
  try {
    const authUser = getAuthUser(res);

    if (!authUser || !authUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (authUser.role !== "seller") {
      return res.status(403).json({
        success: false,
        message: "Approved seller account required",
      });
    }

    const parsed = updateSellerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const seller = await Seller.findOneAndUpdate(
      {
        user: authUser.id,
        status: "approved",
      },
      {
        $set: parsed.data,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Approved seller shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Seller shop updated successfully",
      seller,
    });
  } catch (error) {
    console.error("Update seller shop error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update seller shop",
    });
  }
};

// ==========================================
// 4. ADMIN: LIST PENDING SELLERS
// ==========================================

export const listPendingSellers = async (
  _req: Request,
  res: Response
) => {
  try {
    const authUser = getAuthUser(res);

    if (!authUser || !authUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (authUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin permission required",
      });
    }

    const sellers = await Seller.find({
      status: "pending",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: sellers.length,
      sellers,
    });
  } catch (error) {
    console.error("List pending sellers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending sellers",
    });
  }
};

// ==========================================
// 5. ADMIN: APPROVE OR REJECT SELLER
// ==========================================

export const reviewSeller = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    const authUser = getAuthUser(res);

    if (!authUser || !authUser.isActive) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (authUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin permission required",
      });
    }

    const parsed = reviewSellerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }

    const { decision, rejectionReason } = parsed.data;

    let reviewedSeller: unknown = null;

    await session.withTransaction(async () => {
      const seller = await Seller.findOne({
        _id: req.params.id,
        status: "pending",
      }).session(session);

      if (!seller) {
        throw new Error("SELLER_NOT_FOUND");
      }

      const applicant = await User.findById(seller.user).session(session);

      if (!applicant || !applicant.isActive) {
        throw new Error("APPLICANT_NOT_ACTIVE");
      }

      seller.status = decision;
      seller.reviewedBy = new mongoose.Types.ObjectId(authUser.id);
      seller.reviewedAt = new Date();
      seller.rejectionReason =
        decision === "rejected" ? rejectionReason : undefined;

      await seller.save({ session });

      if (decision === "approved") {
        applicant.role = "seller";
        await applicant.save({ session });
      }

      reviewedSeller = seller;
    });

    return res.status(200).json({
      success: true,
      message:
        decision === "approved"
          ? "Seller approved successfully"
          : "Seller application rejected",
      seller: reviewedSeller,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SELLER_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "Pending seller application not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "APPLICANT_NOT_ACTIVE"
    ) {
      return res.status(409).json({
        success: false,
        message: "Seller applicant is not active",
      });
    }

    console.error("Review seller error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review seller application",
    });
  } finally {
    await session.endSession();
  }
};
