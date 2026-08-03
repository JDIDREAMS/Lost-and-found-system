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
  "Other",
] as const;

export type ItemType = "lost" | "found";
export type ItemStatus = "open" | "claimed" | "resolved";
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface ItemRow {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: ItemType;
  location: string;
  date_occurred: string;
  image_url: string | null;
  status: ItemStatus;
  contact_info: string | null;
  posted_by: string | null;
  poster_name: string;
  created_at: string;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const statusLabel: Record<ItemStatus, string> = {
  open: "Open",
  claimed: "Claim in progress",
  resolved: "Resolved",
};
