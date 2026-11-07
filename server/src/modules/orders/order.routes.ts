import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  createOrder,
  getMyOrders,
  getRestaurantOrders,
  updateOrderStatus,
} from "./order.controller";

const router = Router();

router.post(
  "/",
  requireAuth,
  authorizeRoles("customer"),
  createOrder
);

router.get(
  "/mine",
  requireAuth,
  authorizeRoles("customer"),
  getMyOrders
);

router.get(
  "/restaurant/:restaurantId",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  getRestaurantOrders
);

router.patch(
  "/:id/status",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  updateOrderStatus
);

export default router;