
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  createSellerProduct,
  getMySellerProducts,
  updateSellerProduct,
  updateProductStock,
  deleteSellerProduct,
  listPublicSellerProducts,
} from "./seller-product.controller";

const router = Router();

// Public: View active products from an approved seller
router.get(
  "/seller/:sellerId",
  listPublicSellerProducts
);

// Seller: Create product
router.post(
  "/",
  requireAuth,
  authorizeRoles("seller"),
  createSellerProduct
);

// Seller: View own products
router.get(
  "/mine",
  requireAuth,
  authorizeRoles("seller"),
  getMySellerProducts
);

// Seller: Update product
router.patch(
  "/:id",
  requireAuth,
  authorizeRoles("seller"),
  updateSellerProduct
);

// Seller: Update product stock
router.patch(
  "/:id/stock",
  requireAuth,
  authorizeRoles("seller"),
  updateProductStock
);

// Seller: Delete product
router.delete(
  "/:id",
  requireAuth,
  authorizeRoles("seller"),
  deleteSellerProduct
);

export default router;
