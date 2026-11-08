



import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes";
import restaurantRoutes from "./modules/restaurants/restaurant.routes";
import ownerApplicationRoutes from "./modules/owner-applications/owner-application.routes";
import menuRoutes from "./modules/menu/menu.routes";
import orderRoutes from "./modules/orders/order.routes";
import sellerRoutes from "./modules/marketplace/seller.routes";

const app = express();

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(cookieParser());

// ==========================================
// GLOBAL RATE LIMITING
// ==========================================

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  })
);

// ==========================================
// ROOT API
// ==========================================

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to AMITFOOD API",
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AMITFOOD API is running",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// AUTHENTICATION
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// RESTAURANT MANAGEMENT
// ==========================================

app.use("/api/restaurants", restaurantRoutes);

// ==========================================
// OWNER APPLICATIONS
// ==========================================

app.use("/api/owner-applications", ownerApplicationRoutes);

// ==========================================
// MENU AND CATEGORIES
// ==========================================

app.use("/api/menu", menuRoutes);

// ==========================================
// CUSTOMER ORDERS
// ==========================================

app.use("/api/orders", orderRoutes);

// ==========================================
// MARKETPLACE - SELLER MANAGEMENT
// ==========================================

app.use("/api/marketplace/sellers", sellerRoutes);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

export default app;
