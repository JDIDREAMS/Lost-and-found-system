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

export const itemSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  item_type: z.enum(["lost", "found"]),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location cannot exceed 100 characters"),
  date_occurred: z.string().min(1, "Please select an incident date"),
  contact_info: z
    .string()
    .max(100, "Contact info cannot exceed 100 characters")
    .optional()
    .nullable(),
  image_url: z.string().optional().nullable(),
});

export type ItemInput = z.infer<typeof itemSchema>;
