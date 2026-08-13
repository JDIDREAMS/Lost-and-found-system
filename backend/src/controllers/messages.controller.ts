import { Response } from "express";
import { MessagesService } from "../services/messages.service.js";
import { ClaimsService } from "../services/claims.service.js";
import { NotificationsService } from "../services/notifications.service.js";
import { ItemsService } from "../services/items.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class MessagesController {
  static async listByClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;

    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    const isParticipant =
      claim.claimant_id === user.id || item?.posted_by === user.id || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You are not a participant in this conversation" });
      return;
    }

    const messages = await MessagesService.getByClaimId(claimId);
    res.json({ messages });
  }

  static async send(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const claimId = req.params["claimId"] as string;
    const { text } = req.body;

    const claim = await ClaimsService.getById(claimId);
    if (!claim) {
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const item = await ItemsService.getById(claim.item_id);
    const isParticipant =
      claim.claimant_id === user.id || item?.posted_by === user.id || user.role === "admin";

    if (!isParticipant) {
      res.status(403).json({ error: "Forbidden: You cannot send messages in this conversation" });
      return;
    }

    const message = await MessagesService.send(
      {
        claim_id: claimId,
        sender_id: user.id,
        text,
      },
      user.token,
    );

    // Determine recipient (either claimant or poster)
    const recipientId = user.id === claim.claimant_id ? item?.posted_by : claim.claimant_id;

    if (recipientId && recipientId !== user.id) {
      await NotificationsService.notify({
        user_id: recipientId,
        text: `${user.displayName}: ${text.slice(0, 50)}${text.length > 50 ? "..." : ""}`,
        link: `/claims/${claimId}`,
      });
    }

    res.status(201).json({ message });
  }
}
