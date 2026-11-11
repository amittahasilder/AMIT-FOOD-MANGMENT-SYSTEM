import { Request, Response } from "express";
import mongoose from "mongoose";

import { Cart } from "../cart/cart.model";
import { Menu } from "../menu/menu.model";
import { Restaurant } from "../restaurants/restaurant.model";

import Seller from "../marketplace/seller.model";
import SellerProduct from "../marketplace/seller-product.model";

import { Order } from "./order.model";
import { MarketplaceOrder } from "./marketplace-order.model";
import { checkoutSchema } from "./checkout.validation";

type CheckoutError = Error & {
  statusCode?: number;
};

const getUserId = (res: Response) => res.locals.authUser?.id;

const checkoutError = (message: string, statusCode = 400): CheckoutError => {
  const error = new Error(message) as CheckoutError;
  error.statusCode = statusCode;
  return error;
};

export const checkout = async (_req: Request, res: Response) => {
  const userId = getUserId(res);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Please log in first",
    });
  }

  const authUser = res.locals.authUser;

  if (authUser.role !== "customer" || authUser.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Only active customers can checkout",
    });
  }

  const validation = checkoutSchema.safeParse(_req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid checkout information",
      errors: validation.error.flatten(),
    });
  }

  const checkoutData = validation.data;
  const session = await mongoose.startSession();

  try {
    let createdRestaurantOrders: any[] = [];
    let createdMarketplaceOrders: any[] = [];

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session);

      if (!cart || cart.items.length === 0) {
        throw checkoutError("Your cart is empty", 400);
      }

      const restaurantGroups = new Map<string, any>();
      const sellerGroups = new Map<string, any>();

      // Validate every cart item and calculate prices on the server.
      for (const cartItem of cart.items) {
        if (cartItem.itemType === "restaurant") {
          if (!cartItem.menuItem) {
            throw checkoutError("Invalid restaurant cart item");
          }

          const menuItem = await Menu.findOne({
            _id: cartItem.menuItem,
            isAvailable: true,
          }).session(session);

          if (!menuItem) {
            throw checkoutError("A restaurant menu item is unavailable");
          }

          const restaurantId = menuItem.restaurant.toString();

          const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            status: "approved",
          }).session(session);

          if (!restaurant) {
            throw checkoutError("A restaurant is not available");
          }

          const unitPrice = menuItem.discountPrice ?? menuItem.price;
          const totalPrice = unitPrice * cartItem.quantity;

          if (!restaurantGroups.has(restaurantId)) {
            restaurantGroups.set(restaurantId, {
              restaurant: restaurant._id,
              items: [],
              subtotal: 0,
            });
          }

          const group = restaurantGroups.get(restaurantId);

          group.items.push({
            menuItem: menuItem._id,
            name: menuItem.name,
            quantity: cartItem.quantity,
            unitPrice,
            totalPrice,
          });

          group.subtotal += totalPrice;
        } else if (cartItem.itemType === "marketplace") {
          if (!cartItem.product) {
            throw checkoutError("Invalid marketplace cart item");
          }

          const product = await SellerProduct.findOne({
            _id: cartItem.product,
            status: "active",
          }).session(session);

          if (!product) {
            throw checkoutError("A marketplace product is unavailable");
          }

          const seller = await Seller.findOne({
            _id: product.seller,
            status: "approved",
          }).session(session);

          if (!seller) {
            throw checkoutError("A marketplace seller is not available");
          }

          const sellerId = product.seller.toString();
          const productId = product._id.toString();

          const unitPrice = product.discountPrice ?? product.price;
          const totalPrice = unitPrice * cartItem.quantity;

          if (!sellerGroups.has(sellerId)) {
            sellerGroups.set(sellerId, {
              seller: product.seller,
              items: [],
              subtotal: 0,
              quantities: new Map<string, number>(),
            });
          }

          const group = sellerGroups.get(sellerId);

          group.items.push({
            product: product._id,
            name: product.name,
            quantity: cartItem.quantity,
            unitPrice,
            totalPrice,
          });

          group.subtotal += totalPrice;

          const previousQuantity =
            group.quantities.get(productId) ?? 0;

          group.quantities.set(
            productId,
            previousQuantity + cartItem.quantity
          );
        } else {
          throw checkoutError("Unsupported cart item type");
        }
      }

      const paymentStatus =
        checkoutData.paymentMethod === "online" ? "pending" : "unpaid";

      // Create restaurant orders.
      for (const group of restaurantGroups.values()) {
        const deliveryFee = 0;

        const [order] = await Order.create(
          [
            {
              customer: userId,
              restaurant: group.restaurant,
              items: group.items,
              subtotal: group.subtotal,
              deliveryFee,
              total: group.subtotal + deliveryFee,
              deliveryAddress: checkoutData.deliveryAddress,
              customerPhone: checkoutData.customerPhone,
              notes: checkoutData.notes,
              paymentMethod: checkoutData.paymentMethod,
              paymentStatus,
              orderStatus: "placed",
            },
          ],
          { session }
        );

        createdRestaurantOrders.push(order);
      }

      // Reduce marketplace stock and create seller orders.
      for (const group of sellerGroups.values()) {
        for (const [productId, quantity] of group.quantities.entries()) {
          const updatedProduct = await SellerProduct.findOneAndUpdate(
            {
              _id: productId,
              status: "active",
              stockQuantity: { $gte: quantity },
            },
            {
              $inc: { stockQuantity: -quantity },
            },
            {
              new: true,
              session,
            }
          );

          if (!updatedProduct) {
            throw checkoutError(
              "A marketplace product has insufficient stock"
            );
          }
        }

        const deliveryFee = 0;

        const [order] = await MarketplaceOrder.create(
          [
            {
              customer: userId,
              seller: group.seller,
              items: group.items,
              subtotal: group.subtotal,
              deliveryFee,
              total: group.subtotal + deliveryFee,
              deliveryAddress: checkoutData.deliveryAddress,
              customerPhone: checkoutData.customerPhone,
              notes: checkoutData.notes,
              paymentMethod: checkoutData.paymentMethod,
              paymentStatus,
              orderStatus: "placed",
            },
          ],
          { session }
        );

        createdMarketplaceOrders.push(order);
      }

      // Clear the cart only after all orders have been created.
      cart.items = [] as any;
      await cart.save({ session });
    });

    return res.status(201).json({
      success: true,
      message: "Checkout completed successfully",
      orders: {
        restaurantOrders: createdRestaurantOrders,
        marketplaceOrders: createdMarketplaceOrders,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);

    const checkoutErr = error as CheckoutError;

    return res.status(checkoutErr.statusCode || 500).json({
      success: false,
      message:
        checkoutErr.statusCode
          ? checkoutErr.message
          : "Checkout failed. Please try again.",
    });
  } finally {
    await session.endSession();
  }
};