import { Router } from "express";
import { MessagesController } from "../controllers/messages.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/claims/:claimId/messages", requireAuth, MessagesController.listByClaim);
router.post("/claims/:claimId/messages", requireAuth, MessagesController.send);

export default router;
