

import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Restaurant } from "./restaurant.model";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
} from "./restaurant.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

function getAuthUser(res: Response): AuthUser | undefined {
  return res.locals.authUser as AuthUser | undefined;
}

function isAdmin(res: Response): boolean {
  const user = getAuthUser(res);
  return Boolean(user && user.isActive && user.role === "admin");
}

// Restaurant owner: create a restaurant for admin approval
export async function createRestaurant(req: Request, res: Response) {
  const parsed = createRestaurantSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const user = getAuthUser(res);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (user.role !== "restaurant_owner") {
      res.status(403).json({
        success: false,
        message: "Restaurant-owner access required",
      });
      return;
    }

    const restaurant = await Restaurant.create({
      ...parsed.data,
      owner: user.id,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Restaurant submitted for approval",
      restaurant,
    });
  } catch (error) {
    console.error("Create restaurant error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to create restaurant",
    });
  }
}

// Public: only approved restaurants are visible
export async function listRestaurants(_req: Request, res: Response) {
  try {
    const restaurants = await Restaurant.find({ status: "approved" })
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("List restaurants error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch restaurants",
    });
  }
}

// Restaurant owner: see only their own restaurants
export async function getMyRestaurants(_req: Request, res: Response) {
  try {
    const user = getAuthUser(res);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const restaurants = await Restaurant.find({ owner: user.id })
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("My restaurants error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch your restaurants",
    });
  }
}

// Restaurant owner: update their own editable restaurant details
export async function updateMyRestaurant(req: Request, res: Response) {
  const parsed = updateRestaurantSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant update data",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant ID",
    });
    return;
  }

  try {
    const user = getAuthUser(res);

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (user.role !== "restaurant_owner") {
      res.status(403).json({
        success: false,
        message: "Restaurant-owner access required",
      });
      return;
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: user.id,
        status: { $in: ["pending", "approved"] },
      },
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: "Restaurant not found or cannot be updated",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant,
    });
  } catch (error) {
    console.error("Update restaurant error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update restaurant",
    });
  }
}

// Admin: list restaurants awaiting approval
export async function listPendingRestaurants(
  _req: Request,
  res: Response
) {
  if (!isAdmin(res)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  try {
    const restaurants = await Restaurant.find({ status: "pending" })
      .select("-__v")
      .populate("owner", "name email")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error("List pending restaurants error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch pending restaurants",
    });
  }
}

// Admin: approve or reject a pending restaurant
export async function reviewRestaurant(req: Request, res: Response) {
  if (!isAdmin(res)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid restaurant ID",
    });
    return;
  }

  const decision = req.body?.decision;

  if (decision !== "approved" && decision !== "rejected") {
    res.status(400).json({
      success: false,
      message: 'Decision must be either "approved" or "rejected"',
    });
    return;
  }

  try {
    const restaurant = await Restaurant.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "pending",
      },
      {
        $set: { status: decision },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-__v")
      .lean();

    if (!restaurant) {
      res.status(404).json({
        success: false,
        message: "Pending restaurant not found or already reviewed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        decision === "approved"
          ? "Restaurant approved successfully"
          : "Restaurant rejected",
      restaurant,
    });
  } catch (error) {
    console.error("Review restaurant error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to review restaurant",
    });
  }
}
