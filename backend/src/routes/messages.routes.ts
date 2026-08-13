import { Router } from "express";
import { MessagesController } from "../controllers/messages.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import { sendMessageSchema } from "../schemas/messages.schema.js";

const router = Router();

router.get("/claims/:claimId/messages", requireAuth, MessagesController.listByClaim);
router.post(
  "/claims/:claimId/messages",
  requireAuth,
  validateRequest({ body: sendMessageSchema }),
  MessagesController.send,
);

export default router;
