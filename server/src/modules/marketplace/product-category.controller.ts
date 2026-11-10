
import type { Request, Response } from "express";
import mongoose from "mongoose";

import Seller from "./seller.model";
import ProductCategory from "./product-category.model";
import SellerProduct from "./seller-product.model";

import {
  createProductCategorySchema,
  updateProductCategorySchema,
} from "./product-category.validation";

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

// 1. CREATE PRODUCT CATEGORY
export const createProductCategory = async (
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

    const parsed = createProductCategorySchema.safeParse(req.body);

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

    const category = await ProductCategory.create({
      ...parsed.data,
      seller: seller._id,
      normalizedName: parsed.data.name.toLowerCase().trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Product category created successfully",
      category,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    console.error("Create product category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product category",
    });
  }
};

// 2. GET MY PRODUCT CATEGORIES
export const getMyProductCategories = async (
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

    const categories = await ProductCategory.find({
      seller: seller._id,
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get product categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

// 3. PUBLIC SELLER CATEGORIES
export const listPublicProductCategories = async (
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

    const categories = await ProductCategory.find({
      seller: seller._id,
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Public product categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product categories",
    });
  }
};

// 4. UPDATE PRODUCT CATEGORY
export const updateProductCategory = async (
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
        message: "Invalid category ID",
      });
    }

    const parsed = updateProductCategorySchema.safeParse(req.body);

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

    const category = await ProductCategory.findOne({
      _id: req.params.id,
      seller: seller._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (parsed.data.name) {
      category.name = parsed.data.name;
      category.normalizedName = parsed.data.name.toLowerCase().trim();
    }

    if (parsed.data.description !== undefined) {
      category.description = parsed.data.description;
    }

    if (parsed.data.sortOrder !== undefined) {
      category.sortOrder = parsed.data.sortOrder;
    }

    if (parsed.data.isActive !== undefined) {
      category.isActive = parsed.data.isActive;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Product category updated successfully",
      category,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another category with this name already exists",
      });
    }

    console.error("Update product category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product category",
    });
  }
};

// 5. DELETE PRODUCT CATEGORY
export const deleteProductCategory = async (
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
        message: "Invalid category ID",
      });
    }

    const seller = await getApprovedSeller(authUser.id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller shop not found",
      });
    }

    const category = await ProductCategory.findOne({
      _id: req.params.id,
      seller: seller._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productCount = await SellerProduct.countDocuments({
      seller: seller._id,
      category: category._id,
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category while products are assigned to it",
        productCount,
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product category deleted successfully",
    });
  } catch (error) {
    console.error("Delete product category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product category",
    });
  }
};
