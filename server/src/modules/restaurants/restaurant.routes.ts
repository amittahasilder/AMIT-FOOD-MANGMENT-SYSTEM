
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

import {
  createOrganization,
  getMyOrganizations,
  listPendingOrganizations,
  reviewOrganization,
  createOrganizationBranch,
  getOrganizationBranches,
  reviewOrganizationBranch,
} from "./restaurant-organization.controller";

const router = Router();

// ==========================================
// PUBLIC RESTAURANT ROUTES
// ==========================================

// Get all approved restaurants
router.get("/", listRestaurants);

// ==========================================
// ORGANIZATION MANAGEMENT
// ==========================================

// Create platform or partner organization
router.post(
  "/organizations",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  createOrganization
);

// Get my organizations
router.get(
  "/organizations/mine",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  getMyOrganizations
);

// Admin: get pending organizations
router.get(
  "/organizations/admin/pending",
  requireAuth,
  authorizeRoles("admin"),
  listPendingOrganizations
);

// Admin: approve or reject organization
router.patch(
  "/organizations/admin/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewOrganization
);

// ==========================================
// BRANCH MANAGEMENT
// ==========================================

// Create a branch
router.post(
  "/organizations/:organizationId/branches",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  createOrganizationBranch
);

// Get organization branches
router.get(
  "/organizations/:organizationId/branches",
  requireAuth,
  authorizeRoles("restaurant_owner", "admin"),
  getOrganizationBranches
);

// Admin: approve or reject individual branch
router.patch(
  "/organizations/admin/branches/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewOrganizationBranch
);

// ==========================================
// RESTAURANT OWNER ROUTES
// ==========================================

// Create restaurant + organization + main branch
router.post(
  "/",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  createRestaurant
);

// Get my restaurants
router.get(
  "/mine",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  getMyRestaurants
);

// Update my restaurant
router.patch(
  "/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  updateMyRestaurant
);

// ==========================================
// ADMIN RESTAURANT MANAGEMENT
// ==========================================

// Get pending restaurants
router.get(
  "/admin/pending",
  requireAuth,
  authorizeRoles("admin"),
  listPendingRestaurants
);

// Approve or reject restaurant
router.patch(
  "/admin/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewRestaurant
);

export default router;
