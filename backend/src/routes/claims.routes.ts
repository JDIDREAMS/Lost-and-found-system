import { Router } from "express";
import crypto from "crypto";
import { store, ClaimRecord } from "../db/store.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/items/:id/claims
router.post("/items/:id/claims", requireAuth, (req: AuthenticatedRequest, res) => {
  const itemId = req.params.id;
  const item = store.getItemById(itemId);

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const user = req.user!;
  const { message } = req.body;

  if (!message || String(message).trim().length < 5) {
    res.status(400).json({ error: "A valid proof message is required" });
    return;
  }

  const existingClaim = store.getClaims().find((c) => c.item_id === itemId && c.claimant_id === user.id);
  if (existingClaim) {
    res.status(400).json({ error: "You have already submitted a claim for this item" });
    return;
  }

  const newClaim: ClaimRecord = {
    id: crypto.randomUUID(),
    item_id: itemId,
    claimant_id: user.id,
    message: String(message).trim(),
    status: "pending",
    created_at: new Date().toISOString(),
  };

  store.addClaim(newClaim);

  // Trigger notification to item poster if different
  if (item.posted_by && item.posted_by !== user.id) {
    store.addNotification({
      id: crypto.randomUUID(),
      user_id: item.posted_by,
      text: `${user.displayName || "A student"} submitted a claim on "${item.title}"`,
      link: `/claims/${newClaim.id}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  res.status(201).json({ claim: newClaim });
});

// GET /api/claims (or GET /api/items/:id/claims)
router.get("/claims", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const itemId = req.query.itemId as string | undefined;

  let claims = store.getClaims();

  if (itemId) {
    claims = claims.filter((c) => c.item_id === itemId);
  } else {
    // User sees claims they created or claims on items they posted
    const myItemIds = new Set(store.getItems().filter((i) => i.posted_by === user.id).map((i) => i.id));
    claims = claims.filter((c) => c.claimant_id === user.id || myItemIds.has(c.item_id));
  }

  res.json({ claims });
});

// GET /api/claims/:id
router.get("/claims/:id", requireAuth, (req: AuthenticatedRequest, res) => {
  const claim = store.getClaimById(req.params.id);
  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  const user = req.user!;
  const item = store.getItemById(claim.item_id);

  if (claim.claimant_id !== user.id && item?.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: Not authorized to view this claim" });
    return;
  }

  res.json({ claim, item });
});

// PATCH /api/claims/:id
router.patch("/claims/:id", requireAuth, (req: AuthenticatedRequest, res) => {
  const claim = store.getClaimById(req.params.id);
  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }

  const user = req.user!;
  const item = store.getItemById(claim.item_id);

  if (item?.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: Only item owner can accept/reject claims" });
    return;
  }

  const { status } = req.body;
  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    res.status(400).json({ error: "Invalid claim status" });
    return;
  }

  const updatedClaim = store.updateClaim(req.params.id, { status });

  if (status === "approved" && item) {
    store.updateItem(item.id, { status: "claimed" });
  }

  // Notify claimant
  store.addNotification({
    id: crypto.randomUUID(),
    user_id: claim.claimant_id,
    text: `Your claim on "${item?.title ?? "item"}" was ${status}.`,
    link: `/claims/${claim.id}`,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  res.json({ claim: updatedClaim });
});

export default router;
