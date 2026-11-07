
import type { Request, Response } from "express";
import mongoose from "mongoose";

import { Menu } from "./menu.model";
import { Restaurant } from "../restaurants/restaurant.model";

import {
  createMenuSchema,
  updateMenuSchema,
} from "./menu.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

function getAuthUser(res: Response): AuthUser | undefined {
  return res.locals.authUser as AuthUser | undefined;
}

function requireOwner(res: Response): AuthUser | undefined {
  const user = getAuthUser(res);

  if (
    !user ||
    !user.isActive ||
    user.role !== "restaurant_owner"
  ) {
    return undefined;
  }

  return user;
}

// Owner: create a food item
export async function createMenuItem(
  req: Request,
  res: Response
) {
  const user = requireOwner(res);

  if (!user) {
    res.status(403).json({
      success: false,
      message: "Active restaurant-owner access required",
    });
    return;
  }

  const parsed = createMenuSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid menu data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const restaurant = await Restaurant.findOne({
      _id: parsed.data.restaurant,
      owner: user.id,
      status: { $in: ["pending", "approved"] },
    }).select("_id");

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: "Restaurant not found or not owned by you",
      });
      return;
    }

    const menuItem = await Menu.create({
      ...parsed.data,
      restaurant: restaurant._id,
    });

    res.status(201).json({
      success: true,
      message: "Food item created successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Create menu item error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create food item",
    });
  }
}

// Owner: view all food items of their restaurant
export async function getMyRestaurantMenu(
  req: Request,
  res: Response
) {
  const user = requireOwner(res);

  if (!user) {
    res.status(403).json({
      success: false,
      message: "Active restaurant-owner access required",
    });
    return;
  }

  const { restaurantId } = req.params;

  if (!mongoose.isValidObjectId(restaurantId)) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant ID",
    });
    return;
  }

  try {
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: user.id,
      status: { $in: ["pending", "approved"] },
    }).select("_id name status");

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: "Restaurant not found or not owned by you",
      });
      return;
    }

    const menuItems = await Menu.find({
      restaurant: restaurant._id,
    })
      .select("-__v")
      .sort({ category: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: menuItems.length,
      restaurant,
      menuItems,
    });
  } catch (error) {
    console.error("Get owner menu error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch restaurant menu",
    });
  }
}

// Public: customers can see available food
// only from approved restaurants
export async function getRestaurantMenu(
  req: Request,
  res: Response
) {
  const { restaurantId } = req.params;

  if (!mongoose.isValidObjectId(restaurantId)) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant ID",
    });
    return;
  }

  try {
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: "approved",
    }).select("_id name");

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: "Approved restaurant not found",
      });
      return;
    }

    const menuItems = await Menu.find({
      restaurant: restaurant._id,
      isAvailable: true,
    })
      .select("-__v")
      .sort({ category: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: menuItems.length,
      restaurant,
      menuItems,
    });
  } catch (error) {
    console.error("Get public menu error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch restaurant menu",
    });
  }
}

// Owner: update their own food item
export async function updateMenuItem(
  req: Request,
  res: Response
) {
  const user = requireOwner(res);

  if (!user) {
    res.status(403).json({
      success: false,
      message: "Active restaurant-owner access required",
    });
    return;
  }

  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid menu item ID",
    });
    return;
  }

  const parsed = updateMenuSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid menu update data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const existingItem = await Menu.findById(id).select(
      "restaurant price discountPrice"
    );

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: "Food item not found",
      });
      return;
    }

    const restaurant = await Restaurant.findOne({
      _id: existingItem.restaurant,
      owner: user.id,
      status: { $in: ["pending", "approved"] },
    }).select("_id");

    if (!restaurant) {
      res.status(403).json({
        success: false,
        message: "You cannot update this food item",
      });
      return;
    }

    // Validate the final price combination
    const finalPrice =
      parsed.data.price ?? existingItem.price;

    const finalDiscount =
      parsed.data.discountPrice !== undefined
        ? parsed.data.discountPrice
        : existingItem.discountPrice;

    if (
      finalDiscount !== null &&
      finalDiscount !== undefined &&
      finalDiscount >= finalPrice
    ) {
      res.status(400).json({
        success: false,
        message: "Discount price must be lower than regular price",
      });
      return;
    }

    const menuItem = await Menu.findOneAndUpdate(
      {
        _id: id,
        restaurant: restaurant._id,
      },
      {
        $set: parsed.data,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-__v");

    if (!menuItem) {
      res.status(404).json({
        success: false,
        message: "Food item not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Food item updated successfully",
      menuItem,
    });
  } catch (error) {
    console.error("Update menu item error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update food item",
    });
  }
}

// Owner: delete their own food item
export async function deleteMenuItem(
  req: Request,
  res: Response
) {
  const user = requireOwner(res);

  if (!user) {
    res.status(403).json({
      success: false,
      message: "Active restaurant-owner access required",
    });
    return;
  }

  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid menu item ID",
    });
    return;
  }

  try {
    const existingItem = await Menu.findById(id).select(
      "restaurant"
    );

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: "Food item not found",
      });
      return;
    }

    const restaurant = await Restaurant.findOne({
      _id: existingItem.restaurant,
      owner: user.id,
      status: { $in: ["pending", "approved"] },
    }).select("_id");

    if (!restaurant) {
      res.status(403).json({
        success: false,
        message: "You cannot delete this food item",
      });
      return;
    }

    await Menu.deleteOne({
      _id: id,
      restaurant: restaurant._id,
    });

    res.status(200).json({
      success: true,
      message: "Food item deleted successfully",
    });
  } catch (error) {
    console.error("Delete menu item error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete food item",
    });
  }
}
