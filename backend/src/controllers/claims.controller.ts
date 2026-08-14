import { Response } from "express";
import { ClaimsService } from "../services/claims.service.js";
import { ItemsService } from "../services/items.service.js";
import { NotificationsService } from "../services/notifications.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class ClaimsController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.params["id"] as string;
    const { message, brand, unique_marks, contents_description, serial_fragment } = req.body;

    const item = await ItemsService.getById(itemId);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    if (item.posted_by === user.id) {
      res.status(400).json({ error: "You cannot submit a claim for your own listing" });
      return;
    }

    const proofDetails = {
      brand: brand?.trim() || null,
      unique_marks: unique_marks?.trim() || null,
      contents_description: contents_description?.trim() || null,
      serial_fragment: serial_fragment?.trim() || null,
    };

    const claim = await ClaimsService.create(
      {
        item_id: itemId,
        claimant_id: user.id,
        message,
        proof_details: proofDetails,
        status: "pending",
      },
      user.token,
    );

    // Notify the item poster
    if (item.posted_by && item.posted_by !== user.id) {
      await NotificationsService.notify({
        user_id: item.posted_by,
        text: `New proof-of-ownership claim submitted for your "${item.title}" listing`,
        link: `/claims/${claim.id}`,
      });
    }

    res.status(201).json({ claim });
  }

  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const itemId = req.query["itemId"] as string | undefined;

    if (itemId) {
      const item = await ItemsService.getById(itemId);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      if (item.posted_by !== user.id && user.role !== "admin") {
        res
          .status(403)
          .json({ error: "Forbidden: You are not authorized to view claims for this item" });
        return;
      }
      const claims = await ClaimsService.getByItemId(itemId);
      res.json({ claims });
      return;
    }

    const claims = await ClaimsService.getAllForUser(user.id, user.role);
    res.json({ claims });
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
    const isOwner = item?.posted_by === user.id;
    const isParticipant = claim.claimant_id === user.id || isOwner || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
      return;
    }

    const canViewContact = isOwner || user.role === "admin" || claim.status === "approved";
    const itemResponse = item
      ? {
          ...item,
          contact_info: canViewContact ? item.contact_info : null,
        }
      : null;

    res.json({ claim: { ...claim, items: itemResponse } });
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const { status, decision_reason } = req.body;

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

    const updated = await ClaimsService.updateStatus(
      claimId,
      status,
      decision_reason?.trim() || null,
      user.token,
    );

    // If approved, update item status to claimed
    if (status === "approved" && item) {
      await ItemsService.update(item.id, { status: "claimed" }, user.token);
    }

    // Build notification message with decision reason if available
    let notifText = `Your claim for "${item?.title || "an item"}" has been ${status}.`;
    if (decision_reason?.trim()) {
      notifText += ` Note: "${decision_reason.trim()}"`;
    }

    // Notify claimant
    await NotificationsService.notify({
      user_id: claim.claimant_id,
      text: notifText,
      link: `/claims/${claimId}`,
    });

    res.json({ claim: updated });
  }

  static async proposeMeetup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const { location, scheduled_time, notes } = req.body;

    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    const isParticipant =
      claim.claimant_id === user.id || item?.posted_by === user.id || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
      return;
    }

    const updated = await ClaimsService.proposeMeetup(
      claimId,
      { location, scheduled_time, notes },
      user.id,
    );

    // Notify counterpart
    const recipientId = user.id === claim.claimant_id ? item?.posted_by : claim.claimant_id;
    if (recipientId) {
      await NotificationsService.notify({
        user_id: recipientId,
        text: `📍 Safe Meetup Proposed: ${user.displayName} scheduled a handoff at "${location}"`,
        link: `/claims/${claimId}`,
      });
    }

    res.json({ claim: updated });
  }

  static async respondMeetup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const { status } = req.body;

    const claim = await ClaimsService.getById(claimId);
    if (!claim || !claim.meetup) {
      res.status(404).json({ error: "Claim or meetup proposal not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    const isParticipant =
      claim.claimant_id === user.id || item?.posted_by === user.id || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
      return;
    }

    const updated = await ClaimsService.respondMeetup(claimId, status);

    // Notify proposer
    const recipientId = claim.meetup.proposed_by;
    if (recipientId && recipientId !== user.id) {
      await NotificationsService.notify({
        user_id: recipientId,
        text: `📍 Meetup ${status === "accepted" ? "Confirmed" : "Declined"}: ${user.displayName} ${status} your meetup proposal at "${claim.meetup.location}".`,
        link: `/claims/${claimId}`,
      });
    }

    res.json({ claim: updated });
  }

  static async confirmHandover(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;

    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    const isPoster = item?.posted_by === user.id;
    const isClaimant = claim.claimant_id === user.id;

    if (!isPoster && !isClaimant && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
      return;
    }

    const { claim: updated, isFullyCompleted } = await ClaimsService.confirmHandover(
      claimId,
      user.id,
      isPoster,
      user.token,
    );

    // If fully completed, notify both parties of successful return!
    if (isFullyCompleted) {
      if (item?.posted_by) {
        await NotificationsService.notify({
          user_id: item.posted_by,
          text: `🎉 Handover Completed! "${item.title}" has been successfully returned and marked as resolved.`,
          link: `/items/${item.id}`,
        });
      }
      if (claim.claimant_id) {
        await NotificationsService.notify({
          user_id: claim.claimant_id,
          text: `🎉 Handover Completed! You confirmed receipt of "${item?.title || "your item"}".`,
          link: `/items/${claim.item_id}`,
        });
      }
    } else {
      // Notify counterpart that this side confirmed
      const recipientId = isPoster ? claim.claimant_id : item?.posted_by;
      if (recipientId) {
        await NotificationsService.notify({
          user_id: recipientId,
          text: `🤝 Handover Update: ${user.displayName} has confirmed the handover. Please confirm on your end to complete!`,
          link: `/claims/${claimId}`,
        });
      }
    }

    res.json({ claim: updated, isFullyCompleted });
  }
}
