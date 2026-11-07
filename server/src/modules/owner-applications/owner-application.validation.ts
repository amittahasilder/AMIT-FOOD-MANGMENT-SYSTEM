import { z } from "zod";

export const createOwnerApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessAddress: z.string().trim().min(5).max(300),
  phone: z.string().trim().min(7).max(30),
  description: z.string().trim().max(2000).optional().default(""),
});

export const reviewOwnerApplicationSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().max(500).optional().default(""),
}).refine(
  (data) =>
    data.decision !== "rejected" ||
    data.rejectionReason.trim().length > 0,
  {
    message: "A rejection reason is required",
    path: ["rejectionReason"],
  }
);