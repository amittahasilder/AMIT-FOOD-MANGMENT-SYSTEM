
import { z } from "zod";

const orderItemsSchema = z
  .array(
    z
      .object({
        menuItem: z
          .string()
          .regex(/^[0-9a-fA-F]{24}$/, "Invalid menu item ID"),
        quantity: z.number().int().min(1).max(50),
      })
      .strict()
  )
  .min(1)
  .max(50);

// Existing online customer order.
export const createOrderSchema = z
  .object({
    restaurant: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid restaurant ID"),

    items: orderItemsSchema,

    deliveryAddress: z.string().trim().min(5).max(500),

    customerPhone: z.string().trim().min(6).max(30),

    notes: z.string().trim().max(1000).optional().default(""),

    paymentMethod: z.enum(["cash", "online"]).default("cash"),
  })
  .strict();

// POS order: counter, takeaway, dine-in or delivery.
export const createPosOrderSchema = z
  .object({
    restaurant: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid restaurant ID"),

    items: orderItemsSchema,

    orderType: z.enum(["delivery", "pickup", "dine_in"]),

    customer: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid customer ID")
      .optional(),

    customerName: z.string().trim().max(120).optional().default(""),

    customerPhone: z.string().trim().max(30).optional().default(""),

    tableNumber: z.string().trim().min(1).max(30).optional(),

    deliveryAddress: z.string().trim().max(500).optional().default(""),

    notes: z.string().trim().max(1000).optional().default(""),

    paymentMethod: z.enum(["cash", "online"]).default("cash"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.orderType === "dine_in" && !data.tableNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["tableNumber"],
        message: "Table number is required for dine-in orders",
      });
    }

    if (data.orderType === "delivery") {
      if (data.deliveryAddress.length < 5) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryAddress"],
          message: "Delivery address is required",
        });
      }

      if (data.customerPhone.length < 6) {
        ctx.addIssue({
          code: "custom",
          path: ["customerPhone"],
          message: "Valid customer phone is required for delivery",
        });
      }
    }
  });

// Kitchen status update.
export const updateKitchenStatusSchema = z
  .object({
    kitchenStatus: z.enum([
      "accepted",
      "preparing",
      "ready",
      "served",
      "cancelled",
    ]),
  })
  .strict();
