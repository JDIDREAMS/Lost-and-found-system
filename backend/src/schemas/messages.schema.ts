import { z } from "zod";

export const sendMessageSchema = z.object({
  text: z
    .string()
    .min(1, "Message text cannot be empty")
    .max(3000, "Message cannot exceed 3000 characters"),
});
