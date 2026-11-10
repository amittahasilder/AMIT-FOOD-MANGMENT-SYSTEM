
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  createProductCategory,
  getMyProductCategories,
  listPublicProductCategories,
  updateProductCategory,
  deleteProductCategory,
} from "./product-category.controller";

const router = Router();

// Public: View approved seller categories
router.get(
  "/seller/:sellerId",
  listPublicProductCategories
);

// Seller: Manage own categories
router.post(
  "/",
  requireAuth,
  authorizeRoles("seller"),
  createProductCategory
);

router.get(
  "/mine",
  requireAuth,
  authorizeRoles("seller"),
  getMyProductCategories
);

router.patch(
  "/:id",
  requireAuth,
  authorizeRoles("seller"),
  updateProductCategory
);

router.delete(
  "/:id",
  requireAuth,
  authorizeRoles("seller"),
  deleteProductCategory
);

export default router;
