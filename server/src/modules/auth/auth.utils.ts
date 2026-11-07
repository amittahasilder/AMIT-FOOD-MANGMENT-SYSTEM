
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "amitfood_token";
export const AUTH_ISSUER = "amitfood-api";
export const AUTH_AUDIENCE = "amitfood-client";
export const AUTH_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be configured with at least 32 characters"
    );
  }

  return secret;
}

export function createAuthToken(userId: string, role: string): string {
  return jwt.sign(
    { role },
    getJwtSecret(),
    {
      subject: userId,
      expiresIn: AUTH_TOKEN_TTL_SECONDS,
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
    }
  );
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}
