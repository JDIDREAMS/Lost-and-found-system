import { Router } from "express";
import { WatchlistController } from "../controllers/watchlist.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createWatchlistSchema,
  updateNotificationPreferencesSchema,
} from "../schemas/watchlist.schema.js";

const router = Router();

// Watchlists
router.get("/", requireAuth, WatchlistController.list);
router.post(
  "/",
  requireAuth,
  validateRequest({ body: createWatchlistSchema }),
  WatchlistController.create,
);
router.delete("/:id", requireAuth, WatchlistController.delete);

// Notification Preferences
router.get("/preferences", requireAuth, WatchlistController.getPreferences);
router.patch(
  "/preferences",
  requireAuth,
  validateRequest({ body: updateNotificationPreferencesSchema }),
  WatchlistController.updatePreferences,
);

export default router;
