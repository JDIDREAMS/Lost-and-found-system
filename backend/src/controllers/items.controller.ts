import { Response } from "express";
import { ItemsService } from "../services/items.service.js";
import { ClaimsService } from "../services/claims.service.js";
import { SmartMatcherService } from "../services/matcher.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class ItemsController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawKeyword = (req.query["keyword"] ||
      req.query["query"] ||
      req.query["q"]) as string | undefined;
    const { category, type, status } = req.query;
    const items = await ItemsService.getAll({
      keyword: rawKeyword ? String(rawKeyword).trim() : undefined,
      category: category as string,
      item_type: type as "lost" | "found",
      status: status as string,
    });

    // Mask sensitive details on public list endpoints to protect against opportunists
    const sanitized = items.map((i) => ({
      ...i,
      has_sensitive_details: Boolean(i.sensitive_details),
      sensitive_details: null,
    }));

    res.json({ items: sanitized });
  }

  static async getById(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const item = await ItemsService.getById(req.params["id"] as string);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const user = req.user;
    const userId = user?.id;
    const isAdmin = user?.role === "admin";
    const isOwner =
      Boolean(userId) &&
      (item.posted_by === userId || (user?.email && item.posted_by === user.email));

    // Check if user has an approved claim for this item
    let hasApprovedClaim = false;
    if (userId) {
      const claims = await ClaimsService.getByItemId(item.id);
      hasApprovedClaim = claims.some(
        (c) =>
          (c.claimant_id === userId || (user?.email && c.claimant_id === user.email)) &&
          c.status === "approved",
      );
    }

    const canViewSensitive = isOwner || isAdmin || hasApprovedClaim;

    const responseItem = {
      ...item,
      has_sensitive_details: Boolean(item.sensitive_details),
      sensitive_details: canViewSensitive ? item.sensitive_details || null : null,
      sensitive_details_unlocked: canViewSensitive && Boolean(item.sensitive_details),
    };

    res.json({ item: responseItem });
  }

  static async getMatches(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const itemId = req.params["id"] as string;
    const minScore = req.query["minScore"]
      ? Number(req.query["minScore"])
      : 40;
    const matches = await SmartMatcherService.findMatchesForItem(
      itemId,
      minScore,
    );
    res.json({ matches });
  }

  static async getMySmartMatches(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const user = req.user!;
    const results = await SmartMatcherService.getMatchesForUser(user.id);
    res.json({ results });
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const {
      title,
      description,
      category,
      item_type,
      location,
      date_occurred,
      image_url,
      video_url,
      sensitive_details,
      contact_info,
    } = req.body;

    const item = await ItemsService.create(
      {
        title,
        description: description || "",
        category: category || "Other",
        item_type,
        location: location || "",
        date_occurred: date_occurred || new Date().toISOString().slice(0, 10),
        image_url: image_url || null,
        video_url: video_url || null,
        sensitive_details: sensitive_details || null,
        status: "open",
        contact_info: contact_info || null,
        posted_by: user.id,
        poster_name: user.displayName,
      },
      user.token,
    );

    // Asynchronously evaluate smart matches and trigger push notifications
    void SmartMatcherService.runAutomatedMatchAlerts(item);

    res.status(201).json({ item });
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.params["id"] as string;
    const existing = await ItemsService.getById(itemId);

    if (!existing) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (existing.posted_by !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Unauthorized to update this listing" });
      return;
    }

    const updated = await ItemsService.update(itemId, req.body, user.token);
    res.json({ item: updated });
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.params["id"] as string;
    const existing = await ItemsService.getById(itemId);

    if (!existing) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (existing.posted_by !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Unauthorized to delete this listing" });
      return;
    }

    await ItemsService.delete(itemId, user.token);
    res.json({ message: "Item deleted successfully" });
  }
}
