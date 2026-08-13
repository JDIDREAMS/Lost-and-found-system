import { Router } from "express";
import { ItemsController } from "../controllers/items.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.js";
import { createItemSchema, updateItemSchema } from "../schemas/items.schema.js";

const router = Router();

router.get("/", optionalAuth, ItemsController.list);
router.get("/:id", optionalAuth, ItemsController.getById);
router.post("/", requireAuth, validateRequest({ body: createItemSchema }), ItemsController.create);
router.patch(
  "/:id",
  requireAuth,
  validateRequest({ body: updateItemSchema }),
  ItemsController.update,
);
router.delete("/:id", requireAuth, ItemsController.delete);

export default router;
