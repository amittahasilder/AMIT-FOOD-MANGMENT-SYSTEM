
import { z } from "zod";

// ==========================================
// COMMON VALIDATION
// ==========================================

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ID");

const orderItemsSchema = z
  .array(
    z
      .object({
        menuItem: objectIdSchema,
        quantity: z.number().int().min(1).max(50),
      })
      .strict()
  )
  .min(1, "At least one order item is required")
  .max(50, "Maximum 50 different items allowed");

// ==========================================
// ONLINE CUSTOMER ORDER
// ==========================================

export const createOrderSchema = z
  .object({
    restaurant: objectIdSchema,

    items: orderItemsSchema,

    deliveryAddress: z
      .string()
      .trim()
      .min(5)
      .max(500),

    customerPhone: z
      .string()
      .trim()
      .min(6)
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

// ==========================================
// POS ORDER
// Counter / Takeaway / Dine-in / Delivery
// ==========================================

export const createPosOrderSchema = z
  .object({
    restaurant: objectIdSchema,

    items: orderItemsSchema,

    orderType: z.enum([
      "delivery",
      "pickup",
      "dine_in",
    ]),

    customer: objectIdSchema.optional(),

    customerName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .default(""),

    customerPhone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .default(""),

    // Actual RestaurantTable MongoDB ObjectId.
    table: objectIdSchema.optional(),

    deliveryAddress: z
      .string()
      .trim()
      .max(500)
      .optional()
      .default(""),

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
  .strict()
  .superRefine((data, ctx) => {
    // Dine-in requires an actual table ID.
    if (data.orderType === "dine_in" && !data.table) {
      ctx.addIssue({
        code: "custom",
        path: ["table"],
        message: "A valid table ID is required for dine-in orders",
      });
    }

    // Other order types cannot use a table.
    if (data.orderType !== "dine_in" && data.table) {
      ctx.addIssue({
        code: "custom",
        path: ["table"],
        message: "Table can only be assigned to dine-in orders",
      });
    }

    // Delivery validation.
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

// ==========================================
// KITCHEN STATUS UPDATE
// ==========================================

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
