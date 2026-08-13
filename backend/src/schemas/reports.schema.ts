import { z } from "zod";

export const createReportSchema = z.object({
  target_type: z.enum(["item", "claim", "message"]),
  target_id: z.string().min(1, "Target ID is required"),
  reason: z.enum(["fraud", "fake_claim", "harassment", "inappropriate", "spam", "other"]),
  description: z.string().max(1000).optional().nullable(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["investigating", "resolved", "dismissed"]),
  action_taken: z.enum(["none", "item_removed", "warning_issued", "user_suspended"]).optional(),
  admin_notes: z.string().max(1000).optional().nullable(),
});

export const postFeedbackSchema = z.object({
  claim_id: z.string().min(1, "Claim ID is required"),
  target_user_id: z.string().min(1, "Target user ID is required"),
  rating: z.enum(["positive", "neutral", "negative"]).default("positive"),
  tags: z.array(z.string()).optional(),
  comment: z.string().max(500).optional().nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type PostFeedbackInput = z.infer<typeof postFeedbackSchema>;
