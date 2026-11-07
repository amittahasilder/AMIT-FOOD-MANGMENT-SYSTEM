import { z } from "zod";

export const createOrderSchema = z
  .object({
    restaurant: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid restaurant ID"),

    items: z
      .array(
        z.object({
          menuItem: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid menu item ID"),
          quantity: z.number().int().min(1).max(50),
        }).strict()
      )
      .min(1)
      .max(50),

    deliveryAddress: z.string().trim().min(5).max(500),

    customerPhone: z.string().trim().min(6).max(30),

    notes: z.string().trim().max(1000).optional().default(""),

    paymentMethod: z.enum(["cash", "online"]).default("cash"),
  })
  .strict();