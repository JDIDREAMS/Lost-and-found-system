import { z } from "zod";

export const claimSchema = z.object({
  message: z
    .string()
    .min(10, "Please provide sufficient proof details (at least 10 characters)")
    .max(1000, "Proof message cannot exceed 1000 characters"),
});

export const messageSchema = z.object({
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export type ClaimInput = z.infer<typeof claimSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
