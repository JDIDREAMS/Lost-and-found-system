import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import itemsRoutes from "./routes/items.routes.js";
import claimsRoutes from "./routes/claims.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first (primary), then root .env as fallback (no override)
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env"), override: false });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api", claimsRoutes);
app.use("/api", messagesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/upload", uploadRoutes);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Backend Error:", err);
  res.status(500).json({ error: "Internal Server Error", details: String(err) });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`=================================================`);
  console.log(`🚀 FoundIt Backend API Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://127.0.0.1:${PORT}/api`);
  console.log(`📁 Uploads Static Dir: http://127.0.0.1:${PORT}/uploads`);
  console.log(`=================================================`);
});
