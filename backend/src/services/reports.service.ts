import {
  store,
  ReportRecord,
  AuditLogRecord,
  FeedbackRecord,
} from "../db/store.js";
import { ItemsService } from "./items.service.js";
import { NotificationsService } from "./notifications.service.js";

export interface UserReputation {
  userId: string;
  isStudentVerified: boolean;
  successfulReturnsCount: number;
  positiveFeedbackCount: number;
  trustScore: number;
  badges: Array<{
    id: "verified_student" | "frequent_helper" | "top_finder" | "trusted_member";
    label: string;
    description: string;
  }>;
}

export class ReportsService {
  static async createReport(
    data: {
      target_type: "item" | "claim" | "message";
      target_id: string;
      reason: "fraud" | "fake_claim" | "harassment" | "inappropriate" | "spam" | "other";
      description?: string | null;
    },
    reporterId: string,
  ): Promise<ReportRecord> {
    const report: ReportRecord = {
      id: crypto.randomUUID(),
      target_type: data.target_type,
      target_id: data.target_id,
      reporter_id: reporterId,
      reason: data.reason,
      description: data.description || null,
      status: "open",
      created_at: new Date().toISOString(),
    };

    store.addReport(report);

    // Notify all admin users
    const admins = store.getUsers().filter((u) => u.role === "admin");
    for (const admin of admins) {
      await NotificationsService.notify({
        user_id: admin.id,
        text: `🚨 Moderation Alert: New report submitted on ${data.target_type} (${data.reason})`,
        link: `/admin`,
      });
    }

    return report;
  }

  static async getReports(status?: string) {
    const reports = store.getReports(status);

    // Enrich reports with target preview info
    return reports.map((r) => {
      let preview = "";
      if (r.target_type === "item") {
        const item = store.getItemById(r.target_id);
        preview = item ? `Item: "${item.title}" (${item.item_type})` : "Item (Deleted or Not Found)";
      } else if (r.target_type === "claim") {
        const claim = store.getClaimById(r.target_id);
        preview = claim ? `Claim message: "${claim.message.slice(0, 50)}..."` : "Claim";
      } else if (r.target_type === "message") {
        preview = `Message ID: ${r.target_id}`;
      }

      const reporter = store.getUserById(r.reporter_id);
      return {
        ...r,
        target_preview: preview,
        reporter_name: reporter?.displayName || "Member",
      };
    });
  }

  static async resolveReport(
    reportId: string,
    params: {
      status: "investigating" | "resolved" | "dismissed";
      action_taken?: "none" | "item_removed" | "warning_issued" | "user_suspended";
      admin_notes?: string | null;
    },
    adminUser: { id: string; displayName: string },
    userToken?: string,
  ): Promise<ReportRecord | null> {
    const report = store.getReportById(reportId);
    if (!report) return null;

    const actionTaken = params.action_taken || "none";

    // If action is to remove item, perform deletion
    if (actionTaken === "item_removed" && report.target_type === "item") {
      await ItemsService.delete(report.target_id, userToken);
    }

    const updated = store.updateReport(reportId, {
      status: params.status,
      action_taken: actionTaken,
      admin_notes: params.admin_notes || null,
      resolved_at: new Date().toISOString(),
      resolved_by: adminUser.id,
    });

    // Record Audit Log
    const auditLog: AuditLogRecord = {
      id: crypto.randomUUID(),
      admin_id: adminUser.id,
      admin_name: adminUser.displayName,
      action: `Report ${params.status.toUpperCase()} (${actionTaken})`,
      target_type: report.target_type,
      target_id: report.target_id,
      details: params.admin_notes || `Action: ${actionTaken}`,
      created_at: new Date().toISOString(),
    };
    store.addAuditLog(auditLog);

    // Notify the reporter
    await NotificationsService.notify({
      user_id: report.reporter_id,
      text: `🛡️ Moderation Update: Your report on ${report.target_type} was reviewed and ${params.status}.`,
      link: `/dashboard`,
    });

    return updated;
  }

  static getAuditLogs(): AuditLogRecord[] {
    return store.getAuditLogs();
  }

  static async addFeedback(
    data: {
      claim_id: string;
      target_user_id: string;
      rating: "positive" | "neutral" | "negative";
      tags?: string[];
      comment?: string | null;
    },
    fromUserId: string,
  ): Promise<FeedbackRecord> {
    const feedback: FeedbackRecord = {
      id: crypto.randomUUID(),
      claim_id: data.claim_id,
      from_user_id: fromUserId,
      target_user_id: data.target_user_id,
      rating: data.rating,
      tags: data.tags || [],
      comment: data.comment || null,
      created_at: new Date().toISOString(),
    };

    store.addFeedback(feedback);

    if (data.rating === "positive") {
      await NotificationsService.notify({
        user_id: data.target_user_id,
        text: `⭐ You received a positive trust rating for a successful handover!`,
        link: `/dashboard`,
      });
    }

    return feedback;
  }

  static getUserReputation(userId: string): UserReputation {
    const user = store.getUserById(userId);
    const isStudent = Boolean(user?.isStudentVerified);

    // Count successful returns (where items are resolved and user was poster or claimant)
    const resolvedItems = store
      .getItems()
      .filter((i) => i.posted_by === userId && (i.status === "resolved" || i.status === "claimed"));
    const resolvedClaims = store
      .getClaims()
      .filter((c) => c.claimant_id === userId && (c.status === "approved" || c.handover?.completed_at));

    const successfulReturnsCount = resolvedItems.length + resolvedClaims.length;

    const feedbacks = store.getFeedbacksByUserId(userId);
    const positiveFeedbackCount = feedbacks.filter((f) => f.rating === "positive").length;

    // Calculate trust score (0 - 100)
    let score = 20; // Base score
    if (isStudent) score += 30;
    score += Math.min(successfulReturnsCount * 15, 30);
    score += Math.min(positiveFeedbackCount * 10, 20);
    const trustScore = Math.min(score, 100);

    const badges: UserReputation["badges"] = [];

    if (isStudent) {
      badges.push({
        id: "verified_student",
        label: "Verified Student",
        description: "Enrolled student with verified campus ID.",
      });
    }

    if (successfulReturnsCount >= 3 || (successfulReturnsCount >= 1 && positiveFeedbackCount >= 1)) {
      badges.push({
        id: "frequent_helper",
        label: "Frequent Helper",
        description: "Actively assists campus members in returning items.",
      });
    }

    if (successfulReturnsCount >= 2) {
      badges.push({
        id: "top_finder",
        label: `${successfulReturnsCount} Successful Returns`,
        description: `Verified ${successfulReturnsCount} completed item handovers.`,
      });
    }

    if (trustScore >= 75) {
      badges.push({
        id: "trusted_member",
        label: "Trusted Member",
        description: "High community trust and verified safe interactions.",
      });
    }

    return {
      userId,
      isStudentVerified: isStudent,
      successfulReturnsCount,
      positiveFeedbackCount,
      trustScore,
      badges,
    };
  }
}
