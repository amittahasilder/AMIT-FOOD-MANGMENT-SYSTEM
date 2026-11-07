
import { Request, Response } from "express";
import mongoose from "mongoose";

import { Order } from "./order.model";
import { createOrderSchema } from "./order.validation";
import { Restaurant } from "../restaurants/restaurant.model";
import { Menu } from "../menu/menu.model";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const user = res.locals.authUser;

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
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or not approved",
      });
    }

    const requestedIds = data.items.map((item) => item.menuItem);

    if (new Set(requestedIds).size !== requestedIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate menu items are not allowed",
      });
    }

    const menuItems = await Menu.find({
      _id: { $in: requestedIds },
      restaurant: restaurant._id,
      isAvailable: true,
    }).lean();

    if (menuItems.length !== data.items.length) {
      return res.status(400).json({
        success: false,
        message: "One or more food items are unavailable or invalid",
      });
    }

    const orderItems = data.items.map((requestedItem) => {
      const menuItem = menuItems.find(
        (item) => item._id.toString() === requestedItem.menuItem
      );

      if (!menuItem) {
        throw new Error("Menu item validation failed");
      }

      const unitPrice = menuItem.discountPrice ?? menuItem.price;

      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: requestedItem.quantity,
        unitPrice,
        totalPrice: unitPrice * requestedItem.quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Delivery fee will be calculated by the delivery module later.
    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: user.id,
      restaurant: restaurant._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: data.deliveryAddress,
      customerPhone: data.customerPhone,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      paymentStatus:
        data.paymentMethod === "online" ? "pending" : "unpaid",
      orderStatus: "placed",
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order",
    });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const user = res.locals.authUser;

    if (!user || !user.isActive || user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only active customers can view their orders",
      });
    }

    const orders = await Order.find({
      customer: user.id,
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

export const getRestaurantOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const user = res.locals.authUser;

    if (!user || !user.isActive || user.role !== "restaurant_owner") {
      return res.status(403).json({
        success: false,
        message: "Only active restaurant owners can view restaurant orders",
      });
    }

    // Express 5 params can be string | string[].
    const restaurantId = String(req.params.restaurantId);

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: user.id,
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
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
      message: "Failed to retrieve restaurant orders",
    });
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const user = res.locals.authUser;

    if (!user || !user.isActive || user.role !== "restaurant_owner") {
      return res.status(403).json({
        success: false,
        message: "Only active restaurant owners can update orders",
      });
    }

    // Express 5 params can be string | string[].
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

    const restaurant = await Restaurant.findOne({
      _id: order.restaurant,
      owner: user.id,
    });

    if (!restaurant) {
      return res.status(403).json({
        success: false,
        message: "You do not own this restaurant",
      });
    }

    if (
      ["delivered", "cancelled", "picked_up"].includes(order.orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "This order can no longer be updated",
      });
    }

    order.orderStatus = orderStatus;
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
