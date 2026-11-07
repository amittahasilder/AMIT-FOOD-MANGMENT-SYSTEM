
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../users/user.model";
import {
  AUTH_AUDIENCE,
  AUTH_COOKIE_NAME,
  AUTH_ISSUER,
  getJwtSecret,
} from "./auth.utils";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Please log in first",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
    });

    if (typeof payload === "string" || !payload.sub) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    const user = await User.findById(payload.sub).select(
      "name email role isActive"
    );

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is unavailable",
      });
      return;
    }

    res.locals.authUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}
