import { Router } from "express";
import crypto from "crypto";
import { store, MessageRecord } from "../db/store.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/claims/:claimId/messages
router.get("/claims/:claimId/messages", requireAuth, (req: AuthenticatedRequest, res) => {
  const { claimId } = req.params;
  const claim = store.getClaimById(claimId);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  const user = req.user!;
  const item = store.getItemById(claim.item_id);

  if (claim.claimant_id !== user.id && item?.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
    return;
  }

  const messages = store.getMessagesByClaimId(claimId);
  res.json({ messages });
});

// POST /api/claims/:claimId/messages
router.post("/claims/:claimId/messages", requireAuth, (req: AuthenticatedRequest, res) => {
  const { claimId } = req.params;
  const claim = store.getClaimById(claimId);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  const user = req.user!;
  const item = store.getItemById(claim.item_id);

  if (claim.claimant_id !== user.id && item?.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: You are not a participant in this claim" });
    return;
  }

  const { text } = req.body;
  if (!text || String(text).trim().length === 0) {
    res.status(400).json({ error: "Message text is required" });
    return;
  }

  const newMessage: MessageRecord = {
    id: crypto.randomUUID(),
    claim_id: claimId,
    sender_id: user.id,
    text: String(text).trim(),
    is_read: false,
    created_at: new Date().toISOString(),
  };

  store.addMessage(newMessage);

  // Notify the recipient (other participant)
  const recipientId = user.id === claim.claimant_id ? item?.posted_by : claim.claimant_id;
  if (recipientId) {
    store.addNotification({
      id: crypto.randomUUID(),
      user_id: recipientId,
      text: `New message from ${user.displayName || "a member"} regarding "${item?.title ?? "item"}"`,
      link: `/claims/${claimId}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  res.status(201).json({ message: newMessage });
});

export default router;
