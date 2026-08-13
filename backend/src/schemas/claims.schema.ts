import { z } from "zod";

export const createClaimSchema = z.object({
  message: z
    .string()
    .min(10, "Please provide sufficient proof details (at least 10 characters)")
    .max(2000),
});

export const updateClaimStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});
