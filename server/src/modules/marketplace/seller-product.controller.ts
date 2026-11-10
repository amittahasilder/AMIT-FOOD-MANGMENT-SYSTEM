
import type { Request, Response } from "express";
import mongoose from "mongoose";

import Seller from "./seller.model";
import SellerProduct from "./seller-product.model";
import ProductCategory from "./product-category.model";

import {
  createSellerProductSchema,
  updateSellerProductSchema,
  updateProductStockSchema,
} from "./seller-product.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

const getAuthUser = (res: Response): AuthUser | undefined => {
  return res.locals.authUser as AuthUser | undefined;
};

const getApprovedSeller = async (userId: string) => {
  return Seller.findOne({
    user: userId,
    status: "approved",
  });
};

// ==========================================
// 1. CREATE PRODUCT
// ==========================================

export const createSellerProduct = async (
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

    const parsed = createSellerProductSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Approved seller shop not found",
      });
    }

    const category = await ProductCategory.findOne({
      _id: parsed.data.category,
      seller: seller._id,
      isActive: true,
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Valid active product category not found",
      });
    }

    const product = await SellerProduct.create({
      ...parsed.data,
      seller: seller._id,
      category: category._id,
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    console.error("Create seller product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// ==========================================
// 2. GET MY PRODUCTS
// ==========================================

export const getMySellerProducts = async (
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
        message: "Seller permission required",
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller shop not found",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const filter: Record<string, unknown> = {
      seller: seller._id,
    };

    if (
      ["draft", "active", "inactive", "archived"].includes(
        String(req.query.status)
      )
    ) {
      filter.status = String(req.query.status);
    }

    const [products, total] = await Promise.all([
      SellerProduct.find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      SellerProduct.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error("Get seller products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
    });
  }
};

// ==========================================
// 3. UPDATE PRODUCT
// ==========================================

export const updateSellerProduct = async (
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
        message: "Seller permission required",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const parsed = updateSellerProductSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller shop not found",
      });
    }

    const product = await SellerProduct.findOne({
      _id: req.params.id,
      seller: seller._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const data = parsed.data;

    if (data.category) {
      const category = await ProductCategory.findOne({
        _id: data.category,
        seller: seller._id,
        isActive: true,
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Valid active product category not found",
        });
      }

      product.category = category._id;
    }

    const nextPrice = data.price ?? product.price;
    const nextDiscountPrice =
      data.discountPrice === null
        ? undefined
        : data.discountPrice ?? product.discountPrice;

    if (
      nextDiscountPrice !== undefined &&
      nextDiscountPrice >= nextPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount price must be lower than regular price",
      });
    }

    if (data.name !== undefined) product.name = data.name;
    if (data.description !== undefined) {
      product.description = data.description;
    }
    if (data.price !== undefined) product.price = data.price;

    if (data.discountPrice === null) {
      product.discountPrice = undefined;
    } else if (data.discountPrice !== undefined) {
      product.discountPrice = data.discountPrice;
    }

    if (data.sku !== undefined) product.sku = data.sku;
    if (data.stockQuantity !== undefined) {
      product.stockQuantity = data.stockQuantity;
    }
    if (data.lowStockThreshold !== undefined) {
      product.lowStockThreshold = data.lowStockThreshold;
    }
    if (data.images !== undefined) product.images = data.images;
    if (data.status !== undefined) product.status = data.status;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    console.error("Update seller product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// ==========================================
// 4. UPDATE PRODUCT STOCK
// ==========================================

export const updateProductStock = async (
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
        message: "Seller permission required",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const parsed = updateProductStockSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller shop not found",
      });
    }

    const product = await SellerProduct.findOneAndUpdate(
      {
        _id: req.params.id,
        seller: seller._id,
      },
      {
        $set: {
          stockQuantity: parsed.data.stockQuantity,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product stock",
    });
  }
};

// ==========================================
// 5. DELETE PRODUCT
// ==========================================

export const deleteSellerProduct = async (
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
        message: "Seller permission required",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller shop not found",
      });
    }

    const product = await SellerProduct.findOneAndDelete({
      _id: req.params.id,
      seller: seller._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete seller product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

// ==========================================
// 6. PUBLIC PRODUCT LISTING
// ==========================================

export const listPublicSellerProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const { sellerId } = req.params;

    if (!mongoose.isValidObjectId(sellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID",
      });
    }

    const seller = await Seller.findOne({
      _id: sellerId,
      status: "approved",
    }).select("_id");

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Approved seller not found",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const filter: Record<string, unknown> = {
      seller: seller._id,
      status: "active",
      stockQuantity: { $gt: 0 },
    };

    if (req.query.category) {
      if (!mongoose.isValidObjectId(String(req.query.category))) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      filter.category = new mongoose.Types.ObjectId(
        String(req.query.category)
      );
    }

    const [products, total] = await Promise.all([
      SellerProduct.find(filter)
        .populate("category", "name")
        .select("-sku -__v")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      SellerProduct.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    console.error("Public seller products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
    });
  }
};
