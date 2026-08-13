import { Response } from "express";
import { ItemsService } from "../services/items.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class AdminController {
  static async getAllItems(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const items = await ItemsService.getAll();
    res.json({ items });
  }

  static async deleteItem(req: AuthenticatedRequest, res: Response): Promise<void> {
    const itemId = req.params["id"] as string;
    await ItemsService.delete(itemId, req.user?.token);
    res.json({ message: "Listing removed by admin" });
  }
}
