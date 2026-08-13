import { Router } from "express";
import { ReportsController } from "../controllers/reports.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createReportSchema,
  resolveReportSchema,
  postFeedbackSchema,
} from "../schemas/reports.schema.js";

const router = Router();

// User Report & Feedback Endpoints
router.post(
  "/reports",
  requireAuth,
  validateRequest({ body: createReportSchema }),
  ReportsController.create,
);

router.post(
  "/feedback",
  requireAuth,
  validateRequest({ body: postFeedbackSchema }),
  ReportsController.addFeedback,
);

router.get("/users/:userId/reputation", ReportsController.getReputation);

// Admin Moderation Endpoints
router.get("/admin/reports", requireAuth, ReportsController.list);
router.patch(
  "/admin/reports/:id/resolve",
  requireAuth,
  validateRequest({ body: resolveReportSchema }),
  ReportsController.resolve,
);
router.get("/admin/audit-logs", requireAuth, ReportsController.auditLogs);

export default router;
