
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearMyCart,
} from "./cart.controller";

const router = Router();

// Authentication required
router.use(requireAuth);

// Customer access only
router.use(authorizeRoles("customer"));

// Get current customer's cart
router.get("/", getMyCart);

// Add item to cart
router.post("/", addToCart);

// Update cart item quantity
router.patch("/:itemId", updateCartItem);

// Remove item from cart
router.delete("/:itemId", removeCartItem);

// Clear entire cart
router.delete("/clear", clearMyCart);

export default router;
