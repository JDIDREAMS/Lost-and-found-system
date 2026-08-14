import { z } from "zod";

export const createWatchlistSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  keyword: z.string().max(100).optional().nullable(),
  category: z.string().optional().nullable(),
  campus_zone: z.string().optional().nullable(),
  item_type: z.enum(["lost", "found"]).optional().nullable(),
  notify_email: z.boolean().optional(),
  notify_in_app: z.boolean().optional(),
  notify_whatsapp: z.boolean().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  phone_number: z.string().max(30).optional().nullable(),
  notify_on_claim: z.boolean().optional(),
  notify_on_message: z.boolean().optional(),
  notify_on_match: z.boolean().optional(),
  notify_on_handover: z.boolean().optional(),
  notify_on_watchlist: z.boolean().optional(),
});

export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
