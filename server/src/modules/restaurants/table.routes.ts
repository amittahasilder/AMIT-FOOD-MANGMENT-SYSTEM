
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";

import {
  createTable,
  getRestaurantTables,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "./table.controller";

const router = Router();

// All table routes require authentication.
router.use(requireAuth);

// Create a restaurant table
router.post("/restaurants/tables", createTable);

// Get all tables of a restaurant
router.get(
  "/restaurants/:restaurantId/tables",
  getRestaurantTables
);

// Update table details
router.patch("/restaurants/tables/:id", updateTable);

// Update table status
router.patch(
  "/restaurants/tables/:id/status",
  updateTableStatus
);

// Delete a table
router.delete("/restaurants/tables/:id", deleteTable);

export default router;
