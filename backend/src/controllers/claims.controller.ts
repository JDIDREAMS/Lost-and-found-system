import { Response } from "express";
import { ClaimsService } from "../services/claims.service.js";
import { ItemsService } from "../services/items.service.js";
import { NotificationsService } from "../services/notifications.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class ClaimsController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.params["id"] as string;
    const { message } = req.body;

    const item = await ItemsService.getById(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (item.posted_by === user.id) {
      res.status(400).json({ error: "You cannot submit a claim for your own listing" });
      return;
    }

    const claim = await ClaimsService.create(
      {
        item_id: itemId,
        claimant_id: user.id,
        message,
        status: "pending",
      },
      user.token,
    );

    // Notify the item poster
    if (item.posted_by && item.posted_by !== user.id) {
      await NotificationsService.notify({
        user_id: item.posted_by,
        text: `New claim submitted for your "${item.title}" listing`,
        link: `/claims/${claim.id}`,
      });
    }

    res.status(201).json({ claim });
  }

  static async listByItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.params["id"] as string;

    const item = await ItemsService.getById(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    // Only the item poster or an admin can view claims on an item
    if (item.posted_by !== user.id && user.role !== "admin") {
      res
        .status(403)
        .json({ error: "Forbidden: You are not authorized to view claims for this item" });
      return;
    }

    const claims = await ClaimsService.getByItemId(itemId);
    res.json({ claims });
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);

    // Only the claimant, the item poster, or an admin can access claim details
    const isParticipant =
      claim.claimant_id === user.id || item?.posted_by === user.id || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
      return;
    }

    res.json({ claim: { ...claim, items: item } });
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const { status } = req.body;

    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    if (item && item.posted_by !== user.id && user.role !== "admin") {
      res
        .status(403)
        .json({ error: "Forbidden: Only the item poster or admin can update claim status" });
      return;
    }

    const updated = await ClaimsService.updateStatus(claimId, status, user.token);

    // If approved, update item status to claimed
    if (status === "approved" && item) {
      await ItemsService.update(item.id, { status: "claimed" }, user.token);
    }

    // Notify claimant
    await NotificationsService.notify({
      user_id: claim.claimant_id,
      text: `Your claim for "${item?.title || "an item"}" has been ${status}`,
      link: `/claims/${claimId}`,
    });

    res.json({ claim: updated });
  }
}
