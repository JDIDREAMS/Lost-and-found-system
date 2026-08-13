import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/items", requireAuth, requireAdmin, AdminController.getAllItems);
router.delete("/items/:id", requireAuth, requireAdmin, AdminController.deleteItem);

export default router;
