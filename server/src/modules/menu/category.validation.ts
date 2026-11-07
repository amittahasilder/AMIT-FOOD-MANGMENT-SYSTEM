import { z } from "zod";

export const createCategorySchema = z.object({
  restaurant: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid restaurant ID"
  ),

  name: z.string().trim().min(2).max(50),

  description: z.string().trim().max(500).optional().default(""),

  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),

  description: z.string().trim().max(500).optional(),

  sortOrder: z.number().int().min(0).optional(),

  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "At least one field is required",
  }
);