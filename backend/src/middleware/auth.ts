import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { store, UserRecord } from "../db/store.js";

export const JWT_SECRET = process.env.JWT_SECRET || "foundit-super-secret-jwt-key-2026";

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = store.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "User associated with token no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = store.getUserById(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore errors for optional auth
    }
  }
  next();
}
