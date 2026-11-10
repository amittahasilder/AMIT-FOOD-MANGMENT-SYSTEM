
import { Request, Response } from "express";

import { Cart } from "./cart.model";
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemIdParamsSchema,
} from "./cart.validation";

import { Menu } from "../menu/menu.model";
import { Restaurant } from "../restaurants/restaurant.model";
import Seller from "../marketplace/seller.model";
import SellerProduct from "../marketplace/seller-product.model";

const getUserId = (res: Response) => res.locals.authUser?.id;

// Add restaurant food or marketplace product to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = addToCartSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item",
        errors: validation.error.flatten(),
      });
    }

    const data = validation.data;

    if (data.itemType === "restaurant") {
      const menuItem = await Menu.findOne({
        _id: data.menuItem,
        isAvailable: true,
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item unavailable",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: menuItem.restaurant,
        status: "approved",
      });

      if (!restaurant) {
        return res.status(400).json({
          success: false,
          message: "Restaurant is not available",
        });
      }
    }

    if (data.itemType === "marketplace") {
      const product = await SellerProduct.findOne({
        _id: data.product,
        status: "active",
        stockQuantity: { $gt: 0 },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product unavailable or out of stock",
        });
      }

      const seller = await Seller.findOne({
        _id: product.seller,
        status: "approved",
      });

      if (!seller) {
        return res.status(400).json({
          success: false,
          message: "Seller is not available",
        });
      }

      if (data.quantity > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity exceeds available stock",
        });
      }
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItem = cart.items.find((item: any) => {
      if (item.itemType !== data.itemType) return false;

      if (data.itemType === "restaurant") {
        return item.menuItem?.toString() === data.menuItem;
      }

      return item.product?.toString() === data.product;
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + data.quantity;

      if (newQuantity > 50) {
        return res.status(400).json({
          success: false,
          message: "Maximum cart quantity is 50",
        });
      }

      if (data.itemType === "marketplace") {
        const product = await SellerProduct.findById(data.product);

        if (!product || newQuantity > product.stockQuantity) {
          return res.status(400).json({
            success: false,
            message: "Requested quantity exceeds available stock",
          });
        }
      }

      existingItem.quantity = newQuantity;
    } else {
      cart.items.push(data as any);
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
    });
  }
};

// Get customer's cart
export const getMyCart = async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const cart = await Cart.findOne({ user: userId })
      .populate("items.menuItem")
      .populate("items.product")
      .lean();

    return res.status(200).json({
      success: true,
      cart: cart || { user: userId, items: [] },
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cart",
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const paramsValidation = cartItemIdParamsSchema.safeParse(req.params);
    const bodyValidation = updateCartItemSchema.safeParse(req.body);

    if (!paramsValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID or quantity",
      });
    }

    const { itemId } = paramsValidation.data;
    const { quantity } = bodyValidation.data;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item: any = cart.items.find(
      (entry: any) => entry._id.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    if (item.itemType === "marketplace") {
      const product = await SellerProduct.findOne({
        _id: item.product,
        status: "active",
        stockQuantity: { $gte: quantity },
      });

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Requested quantity exceeds available stock",
        });
      }
    }

    if (item.itemType === "restaurant") {
      const menuItem = await Menu.findOne({
        _id: item.menuItem,
        isAvailable: true,
      });

      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: "Menu item is no longer available",
        });
      }
    }

    item.quantity = quantity;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated successfully",
      cart,
    });
  } catch (error) {
    console.error("Update cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update cart item",
    });
  }
};

// Remove one item from cart
export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = cartItemIdParamsSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart item ID",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.some(
      (item: any) => item._id.toString() === validation.data.itemId
    );

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    cart.items = cart.items.filter(
      (item: any) => item._id.toString() !== validation.data.itemId
    ) as any;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove cart item",
    });
  }
};

// Clear entire cart
export const clearMyCart = async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
      });
    }

    cart.items = [] as any;
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear cart",
    });
  }
};
