import { Router } from "express";
import { NotificationsService } from "../services/notifications.service.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/notifications (User-scoped)
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifications = await NotificationsService.getByUserId(user.id);
  res.json({ notifications });
});

// PATCH /api/notifications/read-all (User-scoped)
router.patch("/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  await NotificationsService.markAllRead(user.id);
  res.json({ message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read (User-scoped)
router.patch("/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifId = req.params["id"] as string;
  await NotificationsService.markRead(notifId, user.id);
  res.json({ message: "Notification marked as read" });
});

export default router;
