import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { apiLimiter } from "./middleware/rate-limiter.js";
import { errorHandler } from "./middleware/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(env.PORT) || 5000;

// Security & Utility Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limit all API calls
app.use("/api", apiLimiter);

// Serve static uploads
const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// Mount Unified API Router
app.use("/api", apiRouter);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`=================================================`);
  console.log(`🚀 FoundIt API Framework running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://127.0.0.1:${PORT}/api`);
  console.log(`🛡️  Security: Helmet + Rate Limiter Active`);
  console.log(`=================================================`);
});

export default app;
