import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { store, UserRecord } from "../db/store.js";
import { JWT_SECRET, requireAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function isSchoolEmail(email: string): boolean {
  if (!email.includes("@")) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".edu.au") ||
    domain.endsWith(".edu.ng") ||
    domain.includes("student") ||
    domain.includes("univ") ||
    domain.includes("college") ||
    domain.includes("campus")
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existingUser = store.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isVerifiedStudent = isSchoolEmail(email) || (studentId && String(studentId).trim().length > 0);

    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: name?.trim() || email.split("@")[0],
      studentId: studentId?.trim() || null,
      isStudentVerified: Boolean(isVerifiedStudent),
      role: "user",
      createdAt: new Date().toISOString(),
    };

    store.addUser(newUser);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        studentId: newUser.studentId,
        isStudentVerified: newUser.isStudentVerified,
        role: newUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", details: String(err) });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = store.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        studentId: user.studentId,
        isStudentVerified: user.isStudentVerified,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: String(err) });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      studentId: user.studentId,
      isStudentVerified: user.isStudentVerified,
      role: user.role,
    },
  });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = store.getUserByEmail(email);
    if (!user) {
      // Return success anyway for security so user enumeration is prevented
      res.json({ message: "Password reset token generated if account exists" });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    store.updateUser(user.id, { resetToken, resetTokenExpires });

    res.json({
      message: "Password reset link generated",
      resetToken, // Returned in dev mode for easy testing
    });
  } catch (err) {
    res.status(500).json({ error: "Forgot password request failed", details: String(err) });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const user = store.getUserByResetToken(token);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    store.updateUser(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Reset password failed", details: String(err) });
  }
});

export default router;
