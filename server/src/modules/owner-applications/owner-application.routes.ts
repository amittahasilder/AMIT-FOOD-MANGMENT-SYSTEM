
import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { authorizeRoles } from "../../middleware/authorize";
import {
  getMyOwnerApplication,
  listPendingOwnerApplications,
  reviewOwnerApplication,
  submitOwnerApplication,
} from "./owner-application.controller";

const router = Router();

// Customer: submit an owner application
router.post("/", requireAuth, submitOwnerApplication);

// Logged-in user: view their own application
router.get("/mine", requireAuth, getMyOwnerApplication);

// Admin only: list applications awaiting review
router.get(
  "/admin/pending",
  requireAuth,
  authorizeRoles("admin"),
  listPendingOwnerApplications
);

// Admin only: approve or reject an application
router.patch(
  "/admin/:id/review",
  requireAuth,
  authorizeRoles("admin"),
  reviewOwnerApplication
);

export default router;
