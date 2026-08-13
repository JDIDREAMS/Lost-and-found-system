import { Response } from "express";
import { ItemsService } from "../services/items.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class ItemsController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const rawKeyword = (req.query["keyword"] || req.query["query"] || req.query["q"]) as
      string | undefined;
    const { category, type, status } = req.query;
    const items = await ItemsService.getAll({
      keyword: rawKeyword ? String(rawKeyword).trim() : undefined,
      category: category as string,
      item_type: type as "lost" | "found",
      status: status as string,
    });
    res.json({ items });
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const item = await ItemsService.getById(req.params["id"] as string);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ item });
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
        status: "open",
        contact_info: contact_info || null,
        posted_by: user.id,
        poster_name: user.displayName,
      },
      user.token,
    );

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
