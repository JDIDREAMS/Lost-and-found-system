import { z } from "zod";

export const createClaimSchema = z.object({
  message: z
    .string()
    .min(10, "Please provide sufficient proof details (at least 10 characters)")
    .max(2000),
  brand: z.string().max(100).optional().nullable(),
  unique_marks: z.string().max(500).optional().nullable(),
  contents_description: z.string().max(500).optional().nullable(),
  serial_fragment: z.string().max(100).optional().nullable(),
});

export const updateClaimStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  decision_reason: z.string().max(500).optional().nullable(),
});

export const proposeMeetupSchema = z.object({
  location: z.string().min(3, "Location must be at least 3 characters").max(150),
  scheduled_time: z.string().min(1, "Valid date and time required"),
  notes: z.string().max(500).optional().nullable(),
});

export const respondMeetupSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type UpdateClaimStatusInput = z.infer<typeof updateClaimStatusSchema>;
export type ProposeMeetupInput = z.infer<typeof proposeMeetupSchema>;
export type RespondMeetupInput = z.infer<typeof respondMeetupSchema>;
