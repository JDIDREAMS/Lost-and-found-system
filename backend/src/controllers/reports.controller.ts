import { Response } from "express";
import { ReportsService } from "../services/reports.service.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export class ReportsController {
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { target_type, target_id, reason, description } = req.body;

    const report = await ReportsService.createReport(
      { target_type, target_id, reason, description },
      user.id,
    );

    res.status(201).json({ report });
  }

  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }

    const status = req.query["status"] as string | undefined;
    const reports = await ReportsService.getReports(status);
    res.json({ reports });
  }

  static async resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }

    const reportId = req.params["id"] as string;
    const { status, action_taken, admin_notes } = req.body;

    const updated = await ReportsService.resolveReport(
      reportId,
      { status, action_taken, admin_notes },
      { id: user.id, displayName: user.displayName },
      user.token,
    );

    if (!updated) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json({ report: updated });
  }

  static async auditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }

    const logs = ReportsService.getAuditLogs();
    res.json({ logs });
  }

  static async addFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user!;
    const { claim_id, target_user_id, rating, tags, comment } = req.body;

    const feedback = await ReportsService.addFeedback(
      { claim_id, target_user_id, rating, tags, comment },
      user.id,
    );

    res.status(201).json({ feedback });
  }

  static async getReputation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = (req.params["userId"] || req.user?.id) as string;
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }

    const reputation = ReportsService.getUserReputation(userId);
    res.json({ reputation });
  }
}
