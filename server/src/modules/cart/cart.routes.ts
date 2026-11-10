
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

// Authentication
router.use(requireAuth);

// Customer only
router.use(authorizeRoles("customer"));

// Get customer cart
router.get("/", getMyCart);

// Add item
router.post("/", addToCart);

// Clear cart - MUST come before /:itemId
router.delete("/clear", clearMyCart);

// Update item quantity
router.patch("/:itemId", updateCartItem);

// Remove item
router.delete("/:itemId", removeCartItem);

export default router;
