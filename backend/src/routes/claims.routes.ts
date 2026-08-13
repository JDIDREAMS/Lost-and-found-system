import { Router } from "express";
import { ClaimsController } from "../controllers/claims.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import {
  createClaimSchema,
  updateClaimStatusSchema,
  proposeMeetupSchema,
  respondMeetupSchema,
} from "../schemas/claims.schema.js";

const router = Router();

router.post(
  "/items/:id/claims",
  requireAuth,
  validateRequest({ body: createClaimSchema }),
  ClaimsController.create,
);
router.get("/claims", requireAuth, ClaimsController.list);
router.get("/items/:id/claims", requireAuth, ClaimsController.listByItem);
router.get("/claims/:claimId", requireAuth, ClaimsController.getById);
router.patch(
  "/claims/:claimId/status",
  requireAuth,
  validateRequest({ body: updateClaimStatusSchema }),
  ClaimsController.updateStatus,
);

// Safe Handover & Meetup Scheduler
router.post(
  "/claims/:claimId/meetup",
  requireAuth,
  validateRequest({ body: proposeMeetupSchema }),
  ClaimsController.proposeMeetup,
);

router.patch(
  "/claims/:claimId/meetup/status",
  requireAuth,
  validateRequest({ body: respondMeetupSchema }),
  ClaimsController.respondMeetup,
);

router.post("/claims/:claimId/handover/confirm", requireAuth, ClaimsController.confirmHandover);

export default router;
