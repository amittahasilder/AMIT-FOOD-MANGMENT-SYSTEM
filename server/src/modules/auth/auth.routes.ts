
// import { Router } from "express";
// import rateLimit from "express-rate-limit";

// import {
//   login,
//   logout,
//   me,
//   register,
//   registerOwner,
// } from "./auth.controller";

// import { requireAuth } from "./auth.middleware";

// const router = Router();

// // Authentication Rate Limiter
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   limit: 10,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: "Too many authentication attempts. Try again later.",
//   },
// });

// // Customer Registration
// router.post("/register", loginLimiter, register);

// // Restaurant Owner Registration
// router.post("/register-owner", loginLimiter, registerOwner);

// // Login
// router.post("/login", loginLimiter, login);

// // Logout
// router.post("/logout", logout);

// // Current Authenticated User
// router.get("/me", requireAuth, me);

// export default router;



import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  login,
  logout,
  me,
  register,
  registerOwner,
} from "./auth.controller";

import { requireAuth } from "./auth.middleware";

const router = Router();

// Authentication Rate Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

// Customer Registration
router.post("/register", loginLimiter, register);

// Restaurant Owner Registration
router.post("/register-owner", loginLimiter, registerOwner);

// Login
router.post("/login", loginLimiter, login);

// Logout
router.post("/logout", logout);

// Current Authenticated User
router.get("/me", requireAuth, me);

export default router;
