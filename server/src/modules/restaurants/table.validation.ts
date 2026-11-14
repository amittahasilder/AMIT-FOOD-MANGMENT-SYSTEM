
import { z } from "zod";

const tableNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[a-zA-Z0-9-]+$/, "Invalid table number");

export const createTableSchema = z
  .object({
    restaurant: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid restaurant ID"),

    tableNumber: tableNumberSchema,

    capacity: z.number().int().min(1).max(50).default(2),

    section: z.string().trim().max(50).optional().default("Main"),

    notes: z.string().trim().max(500).optional().default(""),
  })
  .strict();

export const updateTableSchema = z
  .object({
    tableNumber: tableNumberSchema.optional(),

    capacity: z.number().int().min(1).max(50).optional(),

    section: z.string().trim().max(50).optional(),

    notes: z.string().trim().max(500).optional(),

    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const updateTableStatusSchema = z
  .object({
    status: z.enum([
      "available",
      "occupied",
      "reserved",
      "maintenance",
    ]),
  })
  .strict();
