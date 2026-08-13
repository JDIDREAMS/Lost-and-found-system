import { Router } from "express";
import { ClaimsController } from "../controllers/claims.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import { createClaimSchema, updateClaimStatusSchema } from "../schemas/claims.schema.js";

const router = Router();

router.post(
  "/items/:id/claims",
  requireAuth,
  validateRequest({ body: createClaimSchema }),
  ClaimsController.create,
);
router.get("/items/:id/claims", requireAuth, ClaimsController.listByItem);
router.get("/claims/:claimId", requireAuth, ClaimsController.getById);
router.patch(
  "/claims/:claimId/status",
  requireAuth,
  validateRequest({ body: updateClaimStatusSchema }),
  ClaimsController.updateStatus,
);

export default router;
