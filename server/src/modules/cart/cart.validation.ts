
import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const restaurantCartItemSchema = z
  .object({
    itemType: z.literal("restaurant"),
    menuItem: objectIdSchema,
    quantity: z.number().int().min(1).max(50),
  })
  .strict();

const marketplaceCartItemSchema = z
  .object({
    itemType: z.literal("marketplace"),
    product: objectIdSchema,
    quantity: z.number().int().min(1).max(50),
  })
  .strict();

export const addToCartSchema = z.discriminatedUnion("itemType", [
  restaurantCartItemSchema,
  marketplaceCartItemSchema,
]);

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(50),
  })
  .strict();

export const removeCartItemSchema = z
  .object({
    cartItemId: objectIdSchema,
  })
  .strict();

export const cartItemIdParamsSchema = z
  .object({
    itemId: objectIdSchema,
  });

export type AddToCartInput = z.infer<typeof addToCartSchema>;
