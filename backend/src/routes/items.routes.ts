import { Router } from "express";
import { ItemsController } from "../controllers/items.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", optionalAuth, ItemsController.list);
router.get("/:id", optionalAuth, ItemsController.getById);
router.post("/", requireAuth, ItemsController.create);
router.patch("/:id", requireAuth, ItemsController.update);
router.delete("/:id", requireAuth, ItemsController.delete);

export default router;
