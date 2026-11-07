import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Category } from "./category.model";
import { Menu } from "./menu.model";
import { Restaurant } from "../restaurants/restaurant.model";

import {
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";

const getUserId = (res: Response) => res.locals.authUser?.id;

// CREATE CATEGORY
export const createCategory = async (req: Request, res: Response) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid category information",
        errors: parsed.error.flatten(),
      });
    }

    const userId = getUserId(res);
    const { restaurant: restaurantId, name, description, sortOrder } = parsed.data;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: userId,
      status: { $in: ["pending", "approved"] },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or access denied",
      });
    }

    const category = await Category.create({
      restaurant: restaurantId,
      name,
      normalizedName: name.toLowerCase(),
      description,
      sortOrder,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This category already exists",
      });
    }

    console.error("Create category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// GET OWNER CATEGORIES
export const getMyCategories = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res);
    const restaurantId = req.params.restaurantId;

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: userId,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or access denied",
      });
    }

    const categories = await Category.find({
      restaurant: restaurantId,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// GET PUBLIC CATEGORIES
export const getRestaurantCategories = async (
  req: Request,
  res: Response
) => {
  try {
    const restaurantId = req.params.restaurantId;

    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: "approved",
    }).select("_id");

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const categories = await Category.find({
      restaurant: restaurantId,
      isActive: true,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get public categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// UPDATE CATEGORY
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const parsed = updateCategorySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid category information",
        errors: parsed.error.flatten(),
      });
    }

    const categoryId = req.params.id;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const userId = getUserId(res);
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: category.restaurant,
      owner: userId,
    });

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not own this restaurant",
      });
    }

    const updates = parsed.data;

    if (updates.name !== undefined) {
      category.name = updates.name;
      category.normalizedName = updates.name.toLowerCase();
    }

    if (updates.description !== undefined) {
      category.description = updates.description;
    }

    if (updates.sortOrder !== undefined) {
      category.sortOrder = updates.sortOrder;
    }

    if (updates.isActive !== undefined) {
      category.isActive = updates.isActive;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This category name already exists",
      });
    }

    console.error("Update category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// DELETE CATEGORY
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const userId = getUserId(res);
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: category.restaurant,
      owner: userId,
    });

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not own this restaurant",
      });
    }

    const linkedMenuItems = await Menu.countDocuments({
      restaurant: category.restaurant,
      category: category.name,
    });

    if (linkedMenuItems > 0) {
      return res.status(409).json({
        success: false,
        message: "Move or remove menu items before deleting this category",
        linkedMenuItems,
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};