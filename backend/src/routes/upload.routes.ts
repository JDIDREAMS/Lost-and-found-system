import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const filename = `${crypto.randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file (supports short video clips)
  fileFilter: (_req, file, cb) => {
    const allowedMime = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (allowedMime.includes(file.mimetype) || file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload images (PNG, JPG, WebP) or video (MP4, WebM, MOV)."));
    }
  },
});

const router = Router();

// POST /api/upload/photos (Accepts multiple photos)
router.post("/photos", requireAuth, upload.array("photos", 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No image files uploaded" });
      return;
    }

    const urls = files.map((file) => `/uploads/${file.filename}`);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: "File upload failed", details: String(err) });
  }
});

// POST /api/upload/media (Accepts multiple photos and short videos)
router.post("/media", requireAuth, upload.array("media", 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No media files uploaded" });
      return;
    }

    const media = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype.startsWith("video/") ? ("video" as const) : ("image" as const),
      name: file.originalname,
      size: file.size,
    }));

    const urls = media.map((m) => m.url);
    res.json({ urls, media });
  } catch (err) {
    res.status(500).json({ error: "Media upload failed", details: String(err) });
  }
});

export default router;
