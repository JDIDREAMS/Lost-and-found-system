import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { WatchlistService } from "../services/watchlist.service.js";
import { NotificationsService } from "../services/notifications.service.js";

export class WatchlistController {
  static list(req: AuthenticatedRequest, res: Response): void {
    const user = req.user!;
    const watchlists = WatchlistService.getByUserId(user.id);
    res.json({ watchlists });
  }

  static create(req: AuthenticatedRequest, res: Response): void {
    const user = req.user!;
    const watchlist = WatchlistService.create(user.id, req.body);
    res.status(201).json({ watchlist });
  }

  static delete(req: AuthenticatedRequest, res: Response): void {
    const user = req.user!;
    const id = req.params["id"] as string;
    const deleted = WatchlistService.delete(id, user.id);
    if (!deleted) {
      res.status(404).json({ error: "Watchlist not found" });
      return;
    }
    res.json({ message: "Watchlist deleted successfully" });
  }

  static getPreferences(req: AuthenticatedRequest, res: Response): void {
    const user = req.user!;
    const preferences = NotificationsService.getPreferences(user.id);
    res.json({ preferences });
  }

  static updatePreferences(req: AuthenticatedRequest, res: Response): void {
    const user = req.user!;
    const preferences = NotificationsService.updatePreferences(user.id, req.body);
    res.json({ preferences });
  }
}
