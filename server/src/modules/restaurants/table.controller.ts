
import { Request, Response } from "express";
import mongoose from "mongoose";

import { Restaurant } from "./restaurant.model";
import { RestaurantTable } from "./table.model";

import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
} from "./table.validation";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

const getUser = (res: Response): AuthUser | null => {
  return (res.locals.authUser as AuthUser) || null;
};

// FIX: Type Guard — true হলে user আর null নয়
const canManageTables = (
  user: AuthUser | null
): user is AuthUser => {
  return (
    user !== null &&
    user.isActive &&
    ["restaurant_owner", "admin"].includes(user.role)
  );
};

const getAccessibleRestaurant = async (
  restaurantId: string,
  user: AuthUser
) => {
  const query: Record<string, unknown> = {
    _id: restaurantId,
    status: "approved",
    isActive: true,
  };

  if (user.role !== "admin") {
    query.owner = user.id;
  }

  return Restaurant.findOne(query);
};

// CREATE TABLE
export const createTable = async (req: Request, res: Response) => {
  try {
    const user = getUser(res);

    if (!canManageTables(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to manage restaurant tables",
      });
    }

    const validation = createTableSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid table data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    const restaurant = await getAccessibleRestaurant(
      data.restaurant,
      user
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Approved restaurant not found or access denied",
      });
    }

    const table = await RestaurantTable.create({
      restaurant: restaurant._id,
      tableNumber: data.tableNumber,
      capacity: data.capacity,
      section: data.section,
      notes: data.notes,
    });

    return res.status(201).json({
      success: true,
      message: "Restaurant table created successfully",
      table,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "This table number already exists in this branch",
      });
    }

    console.error("Create table error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create table",
    });
  }
};

// LIST RESTAURANT TABLES
export const getRestaurantTables = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getUser(res);

    if (!canManageTables(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view restaurant tables",
      });
    }

    const restaurantId = String(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await getAccessibleRestaurant(
      restaurantId,
      user
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or access denied",
      });
    }

    const tables = await RestaurantTable.find({
      restaurant: restaurant._id,
    })
      .sort({ section: 1, tableNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tables.length,
      tables,
    });
  } catch (error) {
    console.error("Get restaurant tables error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve restaurant tables",
    });
  }
};

// UPDATE TABLE DETAILS
export const updateTable = async (req: Request, res: Response) => {
  try {
    const user = getUser(res);

    if (!canManageTables(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update restaurant tables",
      });
    }

    const tableId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const validation = updateTableSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid table update data",
        errors: validation.error.flatten(),
      });
    }

    const table = await RestaurantTable.findById(tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const restaurant = await getAccessibleRestaurant(
      table.restaurant.toString(),
      user
    );

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this restaurant",
      });
    }

    if (
      table.status === "occupied" &&
      (
        validation.data.capacity !== undefined ||
        validation.data.isActive === false
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Occupied table cannot be deactivated or have capacity changed",
      });
    }

    Object.assign(table, validation.data);

    await table.save();

    return res.status(200).json({
      success: true,
      message: "Table updated successfully",
      table,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "This table number already exists in this branch",
      });
    }

    console.error("Update table error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update table",
    });
  }
};

// UPDATE TABLE STATUS
export const updateTableStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getUser(res);

    if (!canManageTables(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update table status",
      });
    }

    const tableId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const validation = updateTableStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid table status",
        errors: validation.error.flatten(),
      });
    }

    const table = await RestaurantTable.findById(tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const restaurant = await getAccessibleRestaurant(
      table.restaurant.toString(),
      user
    );

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this restaurant",
      });
    }

    const { status } = validation.data;

    // Occupancy must be controlled by an actual dine-in order.
    if (status === "occupied") {
      return res.status(400).json({
        success: false,
        message:
          "A table becomes occupied when a dine-in order is assigned",
      });
    }

    if (table.status === "occupied" && status !== "available") {
      return res.status(409).json({
        success: false,
        message:
          "Occupied table must be released before changing its status",
      });
    }

    table.status = status;

    if (status === "available") {
      table.currentOrder = null;
      table.occupiedAt = null;
    }

    await table.save();

    return res.status(200).json({
      success: true,
      message: "Table status updated successfully",
      table,
    });
  } catch (error) {
    console.error("Update table status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update table status",
    });
  }
};

// DELETE TABLE
export const deleteTable = async (req: Request, res: Response) => {
  try {
    const user = getUser(res);

    if (!canManageTables(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete restaurant tables",
      });
    }

    const tableId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID",
      });
    }

    const table = await RestaurantTable.findById(tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const restaurant = await getAccessibleRestaurant(
      table.restaurant.toString(),
      user
    );

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this restaurant",
      });
    }

    if (
      table.status === "occupied" ||
      table.status === "reserved" ||
      table.currentOrder
    ) {
      return res.status(409).json({
        success: false,
        message: "Occupied or reserved tables cannot be deleted",
      });
    }

    await table.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error("Delete table error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete table",
    });
  }
};
