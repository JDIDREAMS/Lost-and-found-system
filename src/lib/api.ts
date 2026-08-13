// Use relative URLs so the Vite dev proxy forwards them to Express (port 5000).
// In production, set VITE_API_URL to the deployed backend URL.
const API_BASE_URL = import.meta.env["VITE_API_URL"] || "/api";
const BACKEND_BASE_URL = import.meta.env["VITE_BACKEND_URL"] || "";

export interface User {
  id: string;
  email: string;
  displayName: string;
  studentId?: string | null;
  isStudentVerified: boolean;
  role: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  item_type: "lost" | "found";
  location: string;
  date_occurred: string;
  image_url: string | null;
  status: "open" | "claimed" | "resolved";
  contact_info: string | null;
  posted_by: string | null;
  poster_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProofDetails {
  brand?: string | null;
  unique_marks?: string | null;
  contents_description?: string | null;
  serial_fragment?: string | null;
}

export interface MeetupProposal {
  location: string;
  scheduled_time: string;
  notes?: string | null;
  proposed_by: string;
  status: "proposed" | "accepted" | "declined" | "completed";
  updated_at: string;
}

export interface HandoverStatus {
  poster_confirmed: boolean;
  poster_confirmed_at?: string | null;
  claimant_confirmed: boolean;
  claimant_confirmed_at?: string | null;
  completed_at?: string | null;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  message: string;
  proof_details?: ProofDetails | null | undefined;
  status: "pending" | "approved" | "rejected";
  decision_reason?: string | null | undefined;
  meetup?: MeetupProposal | null | undefined;
  handover?: HandoverStatus | null | undefined;
  created_at: string;
}

export interface Message {
  id: string;
  claim_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  text: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  target_type: "item" | "claim" | "message";
  target_id: string;
  reporter_id: string;
  reporter_name?: string;
  target_preview?: string;
  reason: "fraud" | "fake_claim" | "harassment" | "inappropriate" | "spam" | "other";
  description?: string | null;
  status: "open" | "investigating" | "resolved" | "dismissed";
  action_taken?: "none" | "item_removed" | "warning_issued" | "user_suspended";
  admin_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: string | null;
  created_at: string;
}

export interface UserReputation {
  userId: string;
  isStudentVerified: boolean;
  successfulReturnsCount: number;
  positiveFeedbackCount: number;
  trustScore: number;
  badges: Array<{
    id: "verified_student" | "frequent_helper" | "top_finder" | "trusted_member";
    label: string;
    description: string;
  }>;
}

export interface MatchReason {
  type: "category" | "keywords" | "location" | "date";
  label: string;
  points: number;
}

export interface ScoredMatch {
  item: Item;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  breakdown: MatchReason[];
}

export interface UserSmartMatches {
  sourceItem: Item;
  matches: ScoredMatch[];
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("foundit_token");
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("foundit_token", token);
  } else {
    localStorage.removeItem("foundit_token");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `API Request failed with status ${response.status}`);
  }

  return data as T;
}

export function getImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${path}`;
  return path;
}

export const api = {
  // Auth
  register: (payload: {
    email: string;
    password: string;
    name?: string | undefined;
    studentId?: string | undefined;
  }) =>
    request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User }>("/auth/me"),

  forgotPassword: (email: string) =>
    request<{ message: string; resetToken?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: { token: string; password: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Items
  getItems: (params?: {
    keyword?: string;
    query?: string;
    q?: string;
    category?: string;
    type?: string;
    status?: string;
  }) => {
    const search = new URLSearchParams();
    const kw = params?.keyword || params?.query || params?.q;
    if (kw) search.set("keyword", kw);
    if (params?.category) search.set("category", params.category);
    if (params?.type) search.set("type", params.type);
    if (params?.status) search.set("status", params.status);
    const qStr = search.toString();
    return request<{ items: Item[] }>(`/items${qStr ? `?${qStr}` : ""}`);
  },

  getItemById: (id: string) => request<{ item: Item }>(`/items/${id}`),

  createItem: (payload: Partial<Item>) =>
    request<{ item: Item }>("/items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateItem: (id: string, payload: Partial<Item>) =>
    request<{ item: Item }>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteItem: (id: string) =>
    request<{ message: string }>(`/items/${id}`, {
      method: "DELETE",
    }),

  // Smart Matches
  getItemMatches: (id: string, minScore = 40) =>
    request<{ matches: ScoredMatch[] }>(`/items/${id}/matches?minScore=${minScore}`),

  getMySmartMatches: () => request<{ results: UserSmartMatches[] }>("/items/smart-matches/mine"),

  // Claims
  submitClaim: (
    itemId: string,
    payload:
      | {
          message: string;
          brand?: string | null;
          unique_marks?: string | null;
          contents_description?: string | null;
          serial_fragment?: string | null;
        }
      | string,
  ) => {
    const body = typeof payload === "string" ? { message: payload } : payload;
    return request<{ claim: Claim }>(`/items/${itemId}/claims`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getClaims: (itemId?: string) =>
    request<{ claims: Claim[] }>(`/claims${itemId ? `?itemId=${itemId}` : ""}`),

  getClaimById: (id: string) => request<{ claim: Claim; item: Item }>(`/claims/${id}`),

  updateClaimStatus: (
    claimId: string,
    status: "approved" | "rejected" | "pending",
    decisionReason?: string | null,
  ) =>
    request<{ claim: Claim }>(`/claims/${claimId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, decision_reason: decisionReason }),
    }),

  proposeMeetup: (
    claimId: string,
    payload: { location: string; scheduled_time: string; notes?: string | null },
  ) =>
    request<{ claim: Claim }>(`/claims/${claimId}/meetup`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  respondMeetup: (claimId: string, status: "accepted" | "declined") =>
    request<{ claim: Claim }>(`/claims/${claimId}/meetup/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  confirmHandover: (claimId: string) =>
    request<{ claim: Claim; isFullyCompleted: boolean }>(`/claims/${claimId}/handover/confirm`, {
      method: "POST",
    }),

  // Messages
  getMessages: (claimId: string) => request<{ messages: Message[] }>(`/claims/${claimId}/messages`),

  sendMessage: (claimId: string, text: string) =>
    request<{ message: Message }>(`/claims/${claimId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: Notification[] }>("/notifications"),

  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    request<{ message: string }>("/notifications/read-all", {
      method: "PATCH",
    }),

  // Upload photos
  uploadPhotos: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));
    const res = await request<{ urls: string[] }>("/upload/photos", {
      method: "POST",
      body: formData,
    });
    return res.urls;
  },

  // Moderation & Reports
  createReport: (data: {
    target_type: "item" | "claim" | "message";
    target_id: string;
    reason: "fraud" | "fake_claim" | "harassment" | "inappropriate" | "spam" | "other";
    description?: string | null;
  }) =>
    request<{ report: Report }>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAdminReports: (status?: string) =>
    request<{ reports: Report[] }>(`/admin/reports${status ? `?status=${status}` : ""}`),

  resolveReport: (
    reportId: string,
    data: {
      status: "investigating" | "resolved" | "dismissed";
      action_taken?: "none" | "item_removed" | "warning_issued" | "user_suspended";
      admin_notes?: string | null;
    },
  ) =>
    request<{ report: Report }>(`/admin/reports/${reportId}/resolve`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getAuditLogs: () => request<{ logs: AuditLog[] }>("/admin/audit-logs"),

  // Feedback & Reputation
  postFeedback: (data: {
    claim_id: string;
    target_user_id: string;
    rating: "positive" | "neutral" | "negative";
    tags?: string[];
    comment?: string | null;
  }) =>
    request<{ feedback: unknown }>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getUserReputation: (userId: string) =>
    request<{ reputation: UserReputation }>(`/users/${userId}/reputation`),
};
