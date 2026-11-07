
// import { z } from "zod";

// export const createMenuSchema = z
//   .object({
//     restaurant: z.string().regex(
//       /^[0-9a-fA-F]{24}$/,
//       "Invalid restaurant ID"
//     ),

//     name: z.string().trim().min(2).max(120),

//     description: z.string().trim().max(2000).optional().default(""),

//     category: z.string().trim().min(2).max(50),

//     price: z.number().positive().max(1000000),

//     discountPrice: z
//       .number()
//       .positive()
//       .max(1000000)
//       .nullable()
//       .optional()
//       .default(null),

//     imageUrl: z.string().trim().max(1000).optional().default(""),

//     isAvailable: z.boolean().optional().default(true),
//   })
//   .refine(
//     (data) =>
//       data.discountPrice === null ||
//       data.discountPrice === undefined ||
//       data.discountPrice < data.price,
//     {
//       message: "Discount price must be lower than regular price",
//       path: ["discountPrice"],
//     }
//   );

// export const updateMenuSchema = z
//   .object({
//     name: z.string().trim().min(2).max(120).optional(),

//     description: z.string().trim().max(2000).optional(),

//     category: z.string().trim().min(2).max(50).optional(),

//     price: z.number().positive().max(1000000).optional(),

//     discountPrice: z
//       .number()
//       .positive()
//       .max(1000000)
//       .nullable()
//       .optional(),

//     imageUrl: z.string().trim().max(1000).optional(),

//     isAvailable: z.boolean().optional(),
//   })
//   .refine((data) => Object.keys(data).length > 0, {
//     message: "Provide at least one field to update",
//   });

// export const menuIdSchema = z.object({
//   id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid menu ID"),
// });



import { z } from "zod";

export const createMenuSchema = z
  .object({
    restaurant: z.string().regex(
      /^[0-9a-fA-F]{24}$/,
      "Invalid restaurant ID"
    ),

    name: z.string().trim().min(2).max(120),

    description: z.string().trim().max(2000).optional().default(""),

    category: z.string().trim().min(2).max(50),

    price: z.number().positive().max(1000000),

    discountPrice: z
      .number()
      .positive()
      .max(1000000)
      .nullable()
      .optional()
      .default(null),

    imageUrl: z.string().trim().max(1000).optional().default(""),

    isAvailable: z.boolean().optional().default(true),
  })
  .refine(
    (data) =>
      data.discountPrice === null ||
      data.discountPrice < data.price,
    {
      message: "Discount price must be lower than regular price",
      path: ["discountPrice"],
    }
  );

export const updateMenuSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),

    description: z.string().trim().max(2000).optional(),

    category: z.string().trim().min(2).max(50).optional(),

    price: z.number().positive().max(1000000).optional(),

    discountPrice: z
      .number()
      .positive()
      .max(1000000)
      .nullable()
      .optional(),

    imageUrl: z.string().trim().max(1000).optional(),

    isAvailable: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const menuIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid menu ID"),
});
