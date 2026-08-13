import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { store, UserRecord } from "../db/store.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { env } from "../config/env.js";
import { validateRequest } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";

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
router.post("/register", validateRequest({ body: registerSchema }), async (req, res) => {
  try {
    const { email, password, name, studentId } = req.body;

    const existingUser = store.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isVerifiedStudent =
      isSchoolEmail(email) || (studentId && String(studentId).trim().length > 0);

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

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        studentId: newUser.studentId,
        isStudentVerified: newUser.isStudentVerified,
        role: newUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

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
router.post("/login", validateRequest({ body: loginSchema }), async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        studentId: user.studentId,
        isStudentVerified: user.isStudentVerified,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

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
router.post(
  "/forgot-password",
  validateRequest({ body: forgotPasswordSchema }),
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = store.getUserByEmail(email);
      if (!user) {
        // Return success anyway for security to prevent email enumeration
        res.json({ message: "Password reset instructions generated if account exists" });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = Date.now() + 3600000; // 1 hour

      store.updateUser(user.id, { resetToken, resetTokenExpires });

      res.json({
        message: "Password reset instructions generated",
        resetToken, // Returned in dev mode for easy testing
      });
    } catch (err) {
      res.status(500).json({ error: "Forgot password request failed", details: String(err) });
    }
  },
);

// POST /api/auth/reset-password
router.post("/reset-password", validateRequest({ body: resetPasswordSchema }), async (req, res) => {
  try {
    const { token, password } = req.body;

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

    res.json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: "Reset password failed", details: String(err) });
  }
});

export default router;
