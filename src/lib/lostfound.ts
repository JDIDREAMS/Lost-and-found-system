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

export const CAMPUS_ZONES = [
  { id: "all", label: "All Campus Zones", icon: "🏫" },
  { id: "library", label: "Main Library & Study Commons", icon: "📚" },
  { id: "student_union", label: "Student Union & Food Court", icon: "🍔" },
  { id: "engineering", label: "Engineering & Tech Complex", icon: "⚙️" },
  { id: "science", label: "Science & Research Concourse", icon: "🔬" },
  { id: "sports", label: "Sports Arena & Gymnasium", icon: "⚽" },
  { id: "medical", label: "Health & Medical Centre", icon: "🏥" },
  { id: "hostels", label: "Student Residences / Dorms", icon: "🛏️" },
  { id: "admin", label: "Administrative Block", icon: "🏛️" },
  { id: "other", label: "Other Campus Spot", icon: "📍" },
] as const;

export type CampusZoneId = (typeof CAMPUS_ZONES)[number]["id"];

export const ZONE_KEYWORDS: Record<string, string[]> = {
  library: ["library", "study commons", "reading room", "archive", "lib"],
  student_union: ["union", "student union", "food court", "canteen", "cafeteria", "snack bar"],
  engineering: ["engineering", "tech complex", "workshop", "maker", "cad"],
  science: ["science", "chemistry", "physics", "biology", "research", "lab"],
  sports: ["sports", "arena", "gym", "gymnasium", "stadium", "pitch", "court", "field", "pool"],
  medical: ["medical", "health", "centre", "center", "clinic", "hospital", "pharmacy", "infirmary"],
  hostels: ["hostel", "residence", "dorm", "hall", "flat", "apartment", "living quarters"],
  admin: ["admin", "administration", "bursary", "registry", "dean", "office", "senate"],
  other: ["other", "spot", "park", "street", "gate", "junction"],
};

export function isItemInCampusZone(
  itemCampusZone: string | null | undefined,
  targetZone: string,
  locationText?: string | null,
): boolean {
  if (!targetZone || targetZone === "all" || targetZone === "any") return true;

  const normalizedItemZone = (itemCampusZone || "").trim().toLowerCase();
  const normalizedTarget = targetZone.trim().toLowerCase();

  // Direct match
  if (normalizedItemZone === normalizedTarget) return true;

  // Alias matching (e.g. union <=> student_union)
  if (
    (normalizedTarget === "student_union" && (normalizedItemZone === "union" || normalizedItemZone === "student_union")) ||
    (normalizedTarget === "union" && (normalizedItemZone === "student_union" || normalizedItemZone === "union"))
  ) {
    return true;
  }

  // If item has no zone or has 'other', check location text against keywords
  if (locationText && (!normalizedItemZone || normalizedItemZone === "other")) {
    const loc = locationText.toLowerCase();
    const keywords = ZONE_KEYWORDS[normalizedTarget];
    if (keywords && keywords.some((kw) => loc.includes(kw))) {
      return true;
    }
  }

  return false;
}


export type ItemType = "lost" | "found";
export type ItemStatus = "open" | "claimed" | "resolved" | "expired";
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface ItemRow {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: ItemType;
  campus_zone?: string | null | undefined;
  location: string;
  date_occurred: string;
  image_url: string | null;
  video_url?: string | null | undefined;
  sensitive_details?: string | null | undefined;
  has_sensitive_details?: boolean | undefined;
  sensitive_details_unlocked?: boolean | undefined;
  status: ItemStatus;
  contact_info: string | null;
  posted_by: string | null;
  poster_name: string;
  created_at: string;
  expires_at?: string | null | undefined;
  bumped_at?: string | null | undefined;
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

export function getDaysRemaining(
  createdAt: string,
  expiresAt?: string | null,
): {
  days: number;
  isExpired: boolean;
  text: string;
} {
  const expiryTime = expiresAt
    ? new Date(expiresAt).getTime()
    : new Date(createdAt).getTime() + 30 * 86400000;
  const now = Date.now();
  const diffMs = expiryTime - now;
  const days = Math.ceil(diffMs / 86400000);

  if (days <= 0) {
    return { days: 0, isExpired: true, text: "Expired" };
  }
  return { days, isExpired: false, text: `${days}d left` };
}

export const statusLabel: Record<ItemStatus, string> = {
  open: "Open",
  claimed: "Claim in progress",
  resolved: "Resolved",
  expired: "Expired",
};
