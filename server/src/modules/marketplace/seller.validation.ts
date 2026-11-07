
import { z } from "zod";

export const createSellerSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(2, "Shop name must be at least 2 characters")
    .max(100, "Shop name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional()
    .default(""),

  phone: z
    .string()
    .trim()
    .min(7, "Invalid phone number")
    .max(20, "Phone number cannot exceed 20 characters"),

  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters")
    .max(300, "Address cannot exceed 300 characters"),

  logoUrl: z
    .string()
    .trim()
    .max(2048, "Logo URL is too long")
    .optional()
    .default(""),
});

export const updateSellerSchema = z
  .object({
    shopName: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    phone: z
      .string()
      .trim()
      .min(7)
      .max(20)
      .optional(),

    address: z
      .string()
      .trim()
      .min(5)
      .max(300)
      .optional(),

    logoUrl: z
      .string()
      .trim()
      .max(2048)
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required",
    }
  );

export const reviewSellerSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),

    rejectionReason: z
      .string()
      .trim()
      .max(500)
      .optional(),
  })
  .refine(
    (data) =>
      data.decision !== "rejected" ||
      Boolean(data.rejectionReason?.trim()),
    {
      message: "Rejection reason is required",
      path: ["rejectionReason"],
    }
  );
