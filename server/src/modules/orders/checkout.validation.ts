import { z } from "zod";

export const checkoutSchema = z
  .object({
    deliveryAddress: z
      .string()
      .trim()
      .min(5, "Delivery address must be at least 5 characters")
      .max(500),

    customerPhone: z
      .string()
      .trim()
      .min(6, "Invalid customer phone number")
      .max(30),

    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .default(""),

    paymentMethod: z
      .enum(["cash", "online"])
      .default("cash"),
  })
  .strict();