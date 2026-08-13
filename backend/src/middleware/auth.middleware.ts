import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  studentId?: string | null;
  isStudentVerified: boolean;
  role: "user" | "admin" | "moderator";
  token: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7).trim();

  // 1. Try verifying with Supabase Auth first
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      const u = data.user;
      const metadata = u.user_metadata || {};
      req.user = {
        id: u.id,
        email: u.email || "",
        displayName: (metadata["display_name"] as string) || u.email?.split("@")[0] || "Member",
        studentId: (metadata["student_id"] as string) || null,
        isStudentVerified: Boolean(metadata["is_student_verified"]),
        role: u.email === "admin@foundit.edu" ? "admin" : "user",
        token,
      };
      next();
      return;
    }
  } catch {
    // Fall back to custom JWT if not a Supabase token
  }

  // 2. Fallback to local JWT token
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;
    req.user = {
      id: String(payload["id"] || payload["sub"] || ""),
      email: String(payload["email"] || ""),
      displayName: String(payload["displayName"] || "Member"),
      studentId: (payload["studentId"] as string) || null,
      isStudentVerified: Boolean(payload["isStudentVerified"]),
      role: (payload["role"] as "user" | "admin" | "moderator") || "user",
      token,
    };
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid token" });
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (data?.user) {
      const u = data.user;
      const metadata = u.user_metadata || {};
      req.user = {
        id: u.id,
        email: u.email || "",
        displayName: (metadata["display_name"] as string) || u.email?.split("@")[0] || "Member",
        studentId: (metadata["student_id"] as string) || null,
        isStudentVerified: Boolean(metadata["is_student_verified"]),
        role: u.email === "admin@foundit.edu" ? "admin" : "user",
        token,
      };
    }
  } catch {
    // optional, proceed anyway
  }
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Access denied. Admin role required." });
    return;
  }
  next();
}
