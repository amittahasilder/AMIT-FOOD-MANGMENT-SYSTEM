
import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(""),
}).strict();

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(""),
  branchCode: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9-]+$/).optional(),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().max(30).optional().default(""),
  cuisineTypes: z.array(z.string().trim().min(1).max(50))
    .max(20)
    .optional()
    .default([]),
}).strict();

export const reviewOrganizationSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
}).strict();
