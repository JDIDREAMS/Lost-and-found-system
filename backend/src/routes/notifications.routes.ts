import { Router } from "express";
import { store } from "../db/store.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifications = store.getNotificationsByUserId(user.id);
  res.json({ notifications });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const updated = store.markNotificationRead(req.params.id, user.id);
  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  res.json({ notification: updated });
});

export default router;
