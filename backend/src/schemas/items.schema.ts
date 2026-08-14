import { z } from "zod";

export const CATEGORIES = [
  "Electronics",
  "Student ID & Cards",
  "Books & Notes",
  "Wallets",
  "Keys",
  "Bags",
  "Documents",
  "Lab & Sports Gear",
  "Jewellery",
  "Clothing",
  "Accessories",
  "Pets",
  "Other",
] as const;

export const createItemSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  category: z.string().default("Other"),
  item_type: z.enum(["lost", "found"]),
  campus_zone: z.string().optional().nullable(),
  location: z.string().min(2, "Location must be at least 2 characters").max(100),
  date_occurred: z.string().min(1, "Valid occurrence date required"),
  contact_info: z.string().max(100).optional().nullable(),
  image_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  sensitive_details: z.string().max(1000).optional().nullable(),
  ocr_text: z.string().max(2000).optional().nullable(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  status: z.enum(["open", "claimed", "resolved", "expired"]).optional(),
});
