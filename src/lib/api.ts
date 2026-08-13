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

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  message: string;
  status: "pending" | "approved" | "rejected";
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

  // Claims
  submitClaim: (itemId: string, message: string) =>
    request<{ claim: Claim }>(`/items/${itemId}/claims`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  getClaims: (itemId?: string) =>
    request<{ claims: Claim[] }>(`/claims${itemId ? `?itemId=${itemId}` : ""}`),

  getClaimById: (id: string) => request<{ claim: Claim; item: Item }>(`/claims/${id}`),

  updateClaimStatus: (claimId: string, status: "approved" | "rejected" | "pending") =>
    request<{ claim: Claim }>(`/claims/${claimId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
};
