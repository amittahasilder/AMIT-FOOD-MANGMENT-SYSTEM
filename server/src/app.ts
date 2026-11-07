

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

const app = express();

// Hide Express fingerprint
app.disable("x-powered-by");

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: "1mb" }));

// Parse authentication cookies
app.use(cookieParser());

// Global API rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to AMITFOOD API",
  });
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AMITFOOD API is running",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Restaurant management routes
app.use("/api/restaurants", restaurantRoutes);

// Owner application routes
app.use("/api/owner-applications", ownerApplicationRoutes);

// Food menu management routes
app.use("/api/menu", menuRoutes);

// Customer orders and restaurant order management
app.use("/api/orders", orderRoutes);

export default app;
