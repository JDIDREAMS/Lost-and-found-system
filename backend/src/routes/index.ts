import { Router } from "express";
import authRoutes from "./auth.routes.js";
import itemsRoutes from "./items.routes.js";
import claimsRoutes from "./claims.routes.js";
import messagesRoutes from "./messages.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import uploadRoutes from "./upload.routes.js";
import adminRoutes from "./admin.routes.js";
import reportsRoutes from "./reports.routes.js";
import { authLimiter } from "../middleware/rate-limiter.js";

const apiRouter = Router();

// Rate limited auth operations
apiRouter.use("/auth", authLimiter, authRoutes);

// Resource routes
apiRouter.use("/items", itemsRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/notifications", notificationsRoutes);
apiRouter.use("/upload", uploadRoutes);
apiRouter.use("/", claimsRoutes);
apiRouter.use("/", messagesRoutes);
apiRouter.use("/", reportsRoutes);

export default apiRouter;
