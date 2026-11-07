
// import { Router } from "express";

// import { requireAuth } from "../auth/auth.middleware";
// import { authorizeRoles } from "../../middleware/authorize";

// import {
//   createMenuItem,
//   getMyRestaurantMenu,
//   getRestaurantMenu,
//   updateMenuItem,
//   deleteMenuItem,
// } from "./menu.controller";

// const router = Router();

// // Public: view available food from approved restaurants
// router.get(
//   "/restaurant/:restaurantId",
//   getRestaurantMenu
// );

// // Owner: create a food item
// router.post(
//   "/",
//   requireAuth,
//   authorizeRoles("restaurant_owner"),
//   createMenuItem
// );

// // Owner: view their restaurant menu
// router.get(
//   "/mine/:restaurantId",
//   requireAuth,
//   authorizeRoles("restaurant_owner"),
//   getMyRestaurantMenu
// );

// // Owner: update their own food item
// router.patch(
//   "/:id",
//   requireAuth,
//   authorizeRoles("restaurant_owner"),
//   updateMenuItem
// );

// // Owner: delete their own food item
// router.delete(
//   "/:id",
//   requireAuth,
//   authorizeRoles("restaurant_owner"),
//   deleteMenuItem
// );

// export default router;
import { Router } from "express";

import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";

import {
  createMenuItem,
  getMyRestaurantMenu,
  getRestaurantMenu,
  updateMenuItem,
  deleteMenuItem,
} from "./menu.controller";

import {
  createCategory,
  getMyCategories,
  getRestaurantCategories,
  updateCategory,
  deleteCategory,
} from "./category.controller";

const router = Router();

// ========================================
// CATEGORY MANAGEMENT
// ========================================

// Public: approved restaurant categories
router.get(
  "/categories/restaurant/:restaurantId",
  getRestaurantCategories
);

// Owner: create category
router.post(
  "/categories",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  createCategory
);

// Owner: view own categories
router.get(
  "/categories/mine/:restaurantId",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  getMyCategories
);

// Owner: update category
router.patch(
  "/categories/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  updateCategory
);

// Owner: delete category
router.delete(
  "/categories/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  deleteCategory
);

// ========================================
// FOOD / MENU MANAGEMENT
// ========================================

// Public: view available food
router.get(
  "/restaurant/:restaurantId",
  getRestaurantMenu
);

// Owner: create food
router.post(
  "/",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  createMenuItem
);

// Owner: view own menu
router.get(
  "/mine/:restaurantId",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  getMyRestaurantMenu
);

// Owner: update food
router.patch(
  "/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  updateMenuItem
);

// Owner: delete food
router.delete(
  "/:id",
  requireAuth,
  authorizeRoles("restaurant_owner"),
  deleteMenuItem
);

export default router;