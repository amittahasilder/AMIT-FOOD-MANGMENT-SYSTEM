

import { Request, Response } from "express";
import mongoose from "mongoose";

import { Order } from "./order.model";
import {
  createOrderSchema,
  createPosOrderSchema,
  updateKitchenStatusSchema,
} from "./order.validation";

import { Restaurant } from "../restaurants/restaurant.model";
import { Menu } from "../menu/menu.model";

type AuthUser = {
  id: string;
  role: string;
  isActive: boolean;
};

const getAuthUser = (res: Response): AuthUser | null => {
  return (res.locals.authUser as AuthUser) || null;
};

// Type guard: true means user is definitely AuthUser.
const isRestaurantManager = (
  user: AuthUser | null
): user is AuthUser => {
  return (
    user !== null &&
    user.isActive &&
    ["restaurant_owner", "admin"].includes(user.role)
  );
};

const getRestaurantAccess = async (
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

// Shared menu-price calculation.
// Prices are always read from the database.
const calculateOrderItems = async (
  restaurantId: mongoose.Types.ObjectId,
  requestedItems: Array<{ menuItem: string; quantity: number }>
) => {
  const requestedIds = requestedItems.map(
    (item) => item.menuItem
  );

  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new Error("DUPLICATE_MENU_ITEMS");
  }

  const menuItems = await Menu.find({
    _id: { $in: requestedIds },
    restaurant: restaurantId,
    isAvailable: true,
  }).lean();

  if (menuItems.length !== requestedItems.length) {
    throw new Error("INVALID_MENU_ITEMS");
  }

  return requestedItems.map((requestedItem) => {
    const menuItem = menuItems.find(
      (item) =>
        item._id.toString() === requestedItem.menuItem
    );

    if (!menuItem) {
      throw new Error("INVALID_MENU_ITEMS");
    }

    const unitPrice =
      menuItem.discountPrice ?? menuItem.price;

    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity: requestedItem.quantity,
      unitPrice,
      totalPrice: unitPrice * requestedItem.quantity,
    };
  });
};

// --------------------------------------------------
// ONLINE CUSTOMER ORDER
// --------------------------------------------------

export const createOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!user || !user.isActive || user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only active customers can place orders",
      });
    }

    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    const restaurant = await Restaurant.findOne({
      _id: data.restaurant,
      status: "approved",
      isActive: true,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or not approved",
      });
    }

    const orderItems = await calculateOrderItems(
      restaurant._id,
      data.items
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: user.id,
      restaurant: restaurant._id,
      source: "online",
      orderType: "delivery",
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: data.deliveryAddress,
      customerPhone: data.customerPhone,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      paymentStatus:
        data.paymentMethod === "online"
          ? "pending"
          : "unpaid",
      orderStatus: "placed",
      kitchenStatus: "queued",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE_MENU_ITEMS") {
        return res.status(400).json({
          success: false,
          message: "Duplicate menu items are not allowed",
        });
      }

      if (error.message === "INVALID_MENU_ITEMS") {
        return res.status(400).json({
          success: false,
          message:
            "One or more food items are unavailable or invalid",
        });
      }
    }

    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order",
    });
  }
};

// --------------------------------------------------
// POS ORDER
// --------------------------------------------------

export const createPosOrder = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!isRestaurantManager(user)) {
      return res.status(403).json({
        success: false,
        message:
          "Only restaurant owners or admins can create POS orders",
      });
    }

    const validation = createPosOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid POS order data",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    const restaurant = await getRestaurantAccess(
      data.restaurant,
      user
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Approved restaurant not found or access denied",
      });
    }

    const orderItems = await calculateOrderItems(
      restaurant._id,
      data.items
    );

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: null,
      restaurant: restaurant._id,
      source: "pos",
      orderType: data.orderType,
      createdBy: user.id,
      tableNumber:
        data.orderType === "dine_in"
          ? data.tableNumber
          : null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress:
        data.orderType === "delivery"
          ? data.deliveryAddress
          : "",
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      paymentStatus:
        data.paymentMethod === "online"
          ? "pending"
          : "unpaid",
      orderStatus: "confirmed",
      kitchenStatus: "queued",
    });

    return res.status(201).json({
      success: true,
      message: "POS order created successfully",
      order,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DUPLICATE_MENU_ITEMS") {
        return res.status(400).json({
          success: false,
          message: "Duplicate menu items are not allowed",
        });
      }

      if (error.message === "INVALID_MENU_ITEMS") {
        return res.status(400).json({
          success: false,
          message:
            "One or more food items are unavailable or invalid",
        });
      }
    }

    console.error("Create POS order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create POS order",
    });
  }
};

// --------------------------------------------------
// CUSTOMER ORDER HISTORY
// --------------------------------------------------

export const getMyOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!user || !user.isActive || user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only active customers can view their orders",
      });
    }

    const orders = await Order.find({
      customer: user.id,
      source: "online",
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

// --------------------------------------------------
// RESTAURANT ORDER DASHBOARD
// --------------------------------------------------

export const getRestaurantOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!isRestaurantManager(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view restaurant orders",
      });
    }

    const restaurantId = String(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await getRestaurantAccess(
      restaurantId,
      user
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or access denied",
      });
    }

    const orders = await Order.find({
      restaurant: restaurant._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get restaurant orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

// --------------------------------------------------
// RESTAURANT ORDER STATUS
// --------------------------------------------------

export const updateOrderStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!isRestaurantManager(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update orders",
      });
    }

    const id = String(req.params.id);
    const orderStatus = req.body?.orderStatus;

    const allowedStatuses = [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "cancelled",
    ];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (
      typeof orderStatus !== "string" ||
      !allowedStatuses.includes(orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const restaurant = await getRestaurantAccess(
      order.restaurant.toString(),
      user
    );

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this restaurant",
      });
    }

    if (
      ["delivered", "cancelled", "picked_up", "served"].includes(
        order.orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This order can no longer be updated",
      });
    }

    order.orderStatus = orderStatus;

    if (orderStatus === "preparing") {
      order.kitchenStatus = "preparing";
      order.kitchenStartedAt = new Date();
    }

    if (orderStatus === "ready_for_pickup") {
      order.kitchenStatus = "ready";
      order.kitchenReadyAt = new Date();
    }

    if (orderStatus === "cancelled") {
      order.kitchenStatus = "cancelled";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

// --------------------------------------------------
// KITCHEN DISPLAY QUEUE
// --------------------------------------------------

export const getKitchenOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!isRestaurantManager(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view kitchen orders",
      });
    }

    const restaurantId = String(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await getRestaurantAccess(
      restaurantId,
      user
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message:
          "Restaurant not found or access denied",
      });
    }

    const orders = await Order.find({
      restaurant: restaurant._id,
      kitchenStatus: {
        $in: ["queued", "accepted", "preparing", "ready"],
      },
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get kitchen orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve kitchen orders",
    });
  }
};

// --------------------------------------------------
// KITCHEN STATUS UPDATE
// --------------------------------------------------

export const updateKitchenStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const user = getAuthUser(res);

    if (!isRestaurantManager(user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update kitchen orders",
      });
    }

    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const validation = updateKitchenStatusSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid kitchen status",
        errors: validation.error.flatten(),
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const restaurant = await getRestaurantAccess(
      order.restaurant.toString(),
      user
    );

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have access to this restaurant",
      });
    }

    if (
      ["cancelled", "delivered", "picked_up", "served"].includes(
        order.orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "This order is already closed",
      });
    }

    const { kitchenStatus } = validation.data;

    order.kitchenStatus = kitchenStatus;

    switch (kitchenStatus) {
      case "accepted":
        order.kitchenAcceptedAt = new Date();
        order.orderStatus = "confirmed";
        break;

      case "preparing":
        order.kitchenStartedAt = new Date();
        order.orderStatus = "preparing";
        break;

      case "ready":
        order.kitchenReadyAt = new Date();
        order.orderStatus = "ready_for_pickup";
        break;

      case "served":
        order.servedAt = new Date();
        order.orderStatus = "served";
        break;

      case "cancelled":
        order.orderStatus = "cancelled";
        break;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Kitchen status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Update kitchen status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update kitchen status",
    });
  }
};
