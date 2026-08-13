import { z } from "zod";

export const claimSchema = z.object({
  message: z
    .string()
    .min(10, "Please provide sufficient proof details (at least 10 characters)")
    .max(2000, "Proof message cannot exceed 2000 characters"),
  brand: z.string().max(100, "Brand/Make cannot exceed 100 characters").optional(),
  unique_marks: z.string().max(500, "Unique marks cannot exceed 500 characters").optional(),
  contents_description: z
    .string()
    .max(500, "Contents description cannot exceed 500 characters")
    .optional(),
  serial_fragment: z.string().max(100, "Serial fragment cannot exceed 100 characters").optional(),
});

export const messageSchema = z.object({
  text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export const claimDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decision_reason: z.string().max(500, "Decision note cannot exceed 500 characters").optional(),
});

export const meetupProposalSchema = z.object({
  location: z.string().min(3, "Location must be at least 3 characters").max(150),
  scheduled_time: z.string().min(1, "Scheduled time is required"),
  notes: z.string().max(500).optional(),
});

export type ClaimInput = z.infer<typeof claimSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ClaimDecisionInput = z.infer<typeof claimDecisionSchema>;
export type MeetupProposalInput = z.infer<typeof meetupProposalSchema>;
