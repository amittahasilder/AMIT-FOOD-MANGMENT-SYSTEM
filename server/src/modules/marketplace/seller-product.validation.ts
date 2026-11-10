
import { z } from "zod";

const productImageSchema = z.object({
  url: z.string().trim().url(),
  altText: z.string().trim().max(150).optional().default(""),
});

export const createSellerProductSchema = z.object({
  category: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  sku: z.string().trim().min(2).max(60).optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(productImageSchema).max(10).default([]),
}).refine(
  (data) =>
    data.discountPrice === undefined ||
    data.discountPrice < data.price,
  {
    message: "Discount price must be lower than regular price",
    path: ["discountPrice"],
  }
);

export const updateSellerProductSchema = z.object({
  category: z.string().trim().regex(/^[0-9a-fA-F]{24}$/).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive().optional(),
  discountPrice: z.number().positive().nullable().optional(),
  sku: z.string().trim().min(2).max(60).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  images: z.array(productImageSchema).max(10).optional(),
  status: z.enum(["draft", "active", "inactive"]).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
);

export const updateProductStockSchema = z.object({
  stockQuantity: z.number().int().min(0),
});
