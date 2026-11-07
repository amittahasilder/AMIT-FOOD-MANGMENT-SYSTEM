
import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().max(30).optional().default(""),
  cuisineTypes: z
    .array(z.string().trim().min(1).max(50))
    .max(20)
    .optional()
    .default([]),
});

export const updateRestaurantSchema = createRestaurantSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });
