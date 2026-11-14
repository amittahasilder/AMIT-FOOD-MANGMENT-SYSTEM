

import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Restaurant } from "./restaurant.model";
import { RestaurantOrganization } from "./restaurant-organization.model";

import {
  createOrganizationSchema,
  createBranchSchema,
  reviewOrganizationSchema,
} from "./restaurant-organization.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

function getUser(res: Response): AuthUser | undefined {
  return res.locals.authUser as AuthUser | undefined;
}

function adminOnly(res: Response): boolean {
  const user = getUser(res);
  return Boolean(user?.isActive && user.role === "admin");
}

// 1. Create platform or partner organization
export async function createOrganization(req: Request, res: Response) {
  const parsed = createOrganizationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid organization data",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const user = getUser(res);

    if (!user?.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!["admin", "restaurant_owner"].includes(user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    const ownershipType =
      user.role === "admin" ? "platform" : "partner";

    const organization = await RestaurantOrganization.create({
      ...parsed.data,
      owner: user.id,
      ownershipType,
      status: ownershipType === "platform" ? "approved" : "pending",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Restaurant organization created successfully",
      organization,
    });
  } catch (error) {
    console.error("Create organization error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create organization",
    });
  }
}

// 2. Get organizations owned by logged-in user
export async function getMyOrganizations(
  _req: Request,
  res: Response
) {
  try {
    const user = getUser(res);

    if (!user?.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const organizations = await RestaurantOrganization.find({
      owner: user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    console.error("Get organizations error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch organizations",
    });
  }
}

// 3. Admin: list pending partner organizations
export async function listPendingOrganizations(
  _req: Request,
  res: Response
) {
  if (!adminOnly(res)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  try {
    const organizations = await RestaurantOrganization.find({
      ownershipType: "partner",
      status: "pending",
    })
      .populate("owner", "name email")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    console.error("Pending organizations error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch pending organizations",
    });
  }
}

// 4. Admin: approve/reject organization and all its pending branches
export async function reviewOrganization(
  req: Request,
  res: Response
) {
  if (!adminOnly(res)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid organization ID",
    });
    return;
  }

  const parsed = reviewOrganizationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Decision must be approved or rejected",
      errors: parsed.error.issues,
    });
    return;
  }

  const session = await mongoose.startSession();

  try {
    let updatedOrganization: any = null;
    let updatedBranchCount = 0;

    await session.withTransaction(async () => {
      updatedOrganization =
        await RestaurantOrganization.findOneAndUpdate(
          {
            _id: req.params.id,
            ownershipType: "partner",
            status: "pending",
          },
          {
            $set: {
              status: parsed.data.decision,
            },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );

      if (!updatedOrganization) {
        return;
      }

      const branchResult = await Restaurant.updateMany(
        {
          organization: updatedOrganization._id,
          status: "pending",
        },
        {
          $set: {
            status: parsed.data.decision,
          },
        },
        { session }
      );

      updatedBranchCount = branchResult.modifiedCount;
    });

    if (!updatedOrganization) {
      res.status(404).json({
        success: false,
        message: "Pending partner organization not found or already reviewed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        parsed.data.decision === "approved"
          ? "Organization and pending branches approved successfully"
          : "Organization and pending branches rejected",
      organization: updatedOrganization,
      updatedBranchCount,
    });
  } catch (error) {
    console.error("Review organization error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to review organization",
    });
  } finally {
    await session.endSession();
  }
}

// 5. Create branch under an approved organization
export async function createOrganizationBranch(
  req: Request,
  res: Response
) {
  const parsed = createBranchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid branch data",
      errors: parsed.error.issues,
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.organizationId)) {
    res.status(400).json({
      success: false,
      message: "Invalid organization ID",
    });
    return;
  }

  try {
    const user = getUser(res);

    if (!user?.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const organization = await RestaurantOrganization.findById(
      req.params.organizationId
    );

    if (
      !organization ||
      organization.status !== "approved" ||
      !organization.isActive
    ) {
      res.status(404).json({
        success: false,
        message: "Approved active organization not found",
      });
      return;
    }

    const isPlatform = organization.ownershipType === "platform";

    const isAllowed =
      (isPlatform && user.role === "admin") ||
      (!isPlatform &&
        user.role === "restaurant_owner" &&
        organization.owner?.toString() === user.id);

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        message: "You cannot create branches for this organization",
      });
      return;
    }

    const branchCode = parsed.data.branchCode?.toUpperCase() ?? null;

    if (branchCode) {
      const existingBranch = await Restaurant.findOne({
        organization: organization._id,
        branchCode,
      });

      if (existingBranch) {
        res.status(409).json({
          success: false,
          message: "Branch code already exists",
        });
        return;
      }
    }

    const branch = await Restaurant.create({
      ...parsed.data,
      owner: organization.owner ?? user.id,
      organization: organization._id,
      branchCode,
      status: isPlatform ? "approved" : "pending",
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: isPlatform
        ? "Platform restaurant branch created successfully"
        : "Partner restaurant branch submitted for approval",
      branch,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "Branch code already exists",
      });
      return;
    }

    console.error("Create branch error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create branch",
    });
  }
}

// 6. List branches belonging to an organization
export async function getOrganizationBranches(
  req: Request,
  res: Response
) {
  if (!mongoose.isValidObjectId(req.params.organizationId)) {
    res.status(400).json({
      success: false,
      message: "Invalid organization ID",
    });
    return;
  }

  try {
    const user = getUser(res);

    if (!user?.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const organization = await RestaurantOrganization.findById(
      req.params.organizationId
    ).lean();

    if (!organization) {
      res.status(404).json({
        success: false,
        message: "Organization not found",
      });
      return;
    }

    const isAdmin = user.role === "admin";
    const isOwner = organization.owner?.toString() === user.id;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    const branches = await Restaurant.find({
      organization: organization._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: branches.length,
      branches,
    });
  } catch (error) {
    console.error("Get branches error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch branches",
    });
  }
}

// 7. Admin: approve or reject an individual partner branch
export async function reviewOrganizationBranch(
  req: Request,
  res: Response
) {
  if (!adminOnly(res)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid branch ID",
    });
    return;
  }

  const parsed = reviewOrganizationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Decision must be approved or rejected",
      errors: parsed.error.issues,
    });
    return;
  }

  try {
    const branch = await Restaurant.findOne({
      _id: req.params.id,
      status: "pending",
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        message: "Pending branch not found or already reviewed",
      });
      return;
    }

    if (!branch.organization) {
      res.status(400).json({
        success: false,
        message: "This branch does not belong to an organization",
      });
      return;
    }

    const organization = await RestaurantOrganization.findOne({
      _id: branch.organization,
      ownershipType: "partner",
      status: "approved",
      isActive: true,
    });

    if (!organization) {
      res.status(400).json({
        success: false,
        message: "Branch organization must be approved and active",
      });
      return;
    }

    const updatedBranch = await Restaurant.findOneAndUpdate(
      {
        _id: branch._id,
        status: "pending",
      },
      {
        $set: {
          status: parsed.data.decision,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("owner", "name email")
      .populate("organization")
      .lean();

    if (!updatedBranch) {
      res.status(409).json({
        success: false,
        message: "Branch was already reviewed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        parsed.data.decision === "approved"
          ? "Restaurant branch approved successfully"
          : "Restaurant branch rejected",
      branch: updatedBranch,
    });
  } catch (error) {
    console.error("Review branch error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to review restaurant branch",
    });
  }
}
