import { Router } from "express";
import crypto from "crypto";
import { store, ItemRecord } from "../db/store.js";
import { requireAuth, optionalAuth, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// GET /api/items
router.get("/", optionalAuth, (req, res) => {
  let items = store.getItems();

  const { query, category, type, status } = req.query;

  if (type && (type === "lost" || type === "found")) {
    items = items.filter((i) => i.item_type === type);
  }

  if (category && category !== "All") {
    items = items.filter((i) => i.category.toLowerCase() === String(category).toLowerCase());
  }

  if (status) {
    items = items.filter((i) => i.status === status);
  }

  if (query && String(query).trim()) {
    const q = String(query).toLowerCase().trim();
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
    );
  }

  res.json({ items });
});

// GET /api/items/:id
router.get("/:id", (req, res) => {
  const item = store.getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  res.json({ item });
});

// POST /api/items
router.post("/", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, category, item_type, location, date_occurred, image_url, contact_info } = req.body;

    if (!title || !item_type) {
      res.status(400).json({ error: "Title and item_type are required" });
      return;
    }

    const user = req.user!;

    const newItem: ItemRecord = {
      id: crypto.randomUUID(),
      title: String(title).trim(),
      description: String(description || "").trim(),
      category: String(category || "Other"),
      item_type: item_type === "found" ? "found" : "lost",
      location: String(location || "").trim(),
      date_occurred: date_occurred || new Date().toISOString().slice(0, 10),
      image_url: image_url || null,
      status: "open",
      contact_info: contact_info ? String(contact_info).trim() : null,
      posted_by: user.id,
      poster_name: user.displayName || user.email.split("@")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.addItem(newItem);

    res.status(201).json({ item: newItem });
  } catch (err) {
    res.status(500).json({ error: "Failed to create item", details: String(err) });
  }
});

// PATCH /api/items/:id
router.patch("/:id", requireAuth, (req: AuthenticatedRequest, res) => {
  const item = store.getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const user = req.user!;
  if (item.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: You are not the owner of this post" });
    return;
  }

  const updated = store.updateItem(req.params.id, req.body);
  res.json({ item: updated });
});

// DELETE /api/items/:id
router.delete("/:id", requireAuth, (req: AuthenticatedRequest, res) => {
  const item = store.getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const user = req.user!;
  if (item.posted_by !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: You are not the owner of this post" });
    return;
  }

  store.deleteItem(req.params.id);
  res.json({ message: "Item deleted successfully" });
});

export default router;
