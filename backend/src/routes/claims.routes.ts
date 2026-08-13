import { Router } from "express";
import { ClaimsController } from "../controllers/claims.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/items/:id/claims", requireAuth, ClaimsController.create);
router.get("/items/:id/claims", requireAuth, ClaimsController.listByItem);
router.get("/claims/:claimId", requireAuth, ClaimsController.getById);
router.patch("/claims/:claimId/status", requireAuth, ClaimsController.updateStatus);

export default router;
