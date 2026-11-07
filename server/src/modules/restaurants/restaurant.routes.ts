

import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";
import {
  createRestaurant,
  getMyRestaurants,
  listPendingRestaurants,
  listRestaurants,
  reviewRestaurant,
  updateMyRestaurant,
} from "./restaurant.controller";

const router = Router();

// Public: approved restaurants only
router.get("/", listRestaurants);

// Owner-only routes
router.post(
  "/",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  createRestaurant
);

router.get(
  "/mine",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  getMyRestaurants
);

router.patch(
  "/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  updateMyRestaurant
);

// Admin-only: pending restaurant approval
router.get(
  "/admin/pending",
  requireAuth,
  authorizeRoles("admin"),
  listPendingRestaurants
);

router.patch(
  "/admin/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewRestaurant
);

export default router;
