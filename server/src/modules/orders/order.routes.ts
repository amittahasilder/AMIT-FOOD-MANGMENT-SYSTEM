
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  createOrder,
  createPosOrder,
  getMyOrders,
  getRestaurantOrders,
  updateOrderStatus,
  getKitchenOrders,
  updateKitchenStatus,
} from "./order.controller";

const router = Router();

// Customer online orders
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

// POS: Counter, Dine-in, Takeaway, Delivery
router.post(
  "/pos",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  createPosOrder
);

// Restaurant order dashboard
router.get(
  "/restaurant/:restaurantId",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  getRestaurantOrders
);

// Restaurant order status
router.patch(
  "/:id/status",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  updateOrderStatus
);

// Kitchen display queue
router.get(
  "/kitchen/:restaurantId",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  getKitchenOrders
);

// Kitchen status update
router.patch(
  "/kitchen/:id/status",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  updateKitchenStatus
);

export default router;
