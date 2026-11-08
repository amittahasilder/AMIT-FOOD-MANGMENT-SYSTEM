
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  submitSellerApplication,
  getMySellerShop,
  updateMySellerShop,
  listPendingSellers,
  reviewSeller,
} from "./seller.controller";

const router = Router();

// Customer: Apply for seller account
router.post(
  "/apply",
  requireAuth,
  authorizeRoles("customer"),
  submitSellerApplication
);

// Authenticated user: View own seller application/shop
router.get(
  "/mine",
  requireAuth,
  getMySellerShop
);

// Approved seller: Update shop
router.patch(
  "/mine",
  requireAuth,
  authorizeRoles("seller"),
  updateMySellerShop
);

// Admin: View pending applications
router.get(
  "/admin/pending",
  requireAuth,
  authorizeRoles("admin"),
  listPendingSellers
);

// Admin: Approve or reject seller
router.patch(
  "/admin/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewSeller
);

export default router;
