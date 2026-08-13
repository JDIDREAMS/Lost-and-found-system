import { describe, it, expect } from "vitest";
import {
  createReportSchema,
  resolveReportSchema,
  postFeedbackSchema,
} from "../../backend/src/schemas/reports.schema";
import { ReportsService } from "../../backend/src/services/reports.service";
import { store, UserRecord } from "../../backend/src/db/store";

describe("Escalation / Moderation & Reputation Trust Signals", () => {
  describe("Report & Moderation Schemas", () => {
    it("validates a legitimate report payload", () => {
      const valid = createReportSchema.safeParse({
        target_type: "item",
        target_id: "item-123",
        reason: "fake_claim",
        description: "User submitted fake serial numbers to claim a MacBook.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects report with invalid target type or empty ID", () => {
      const invalidType = createReportSchema.safeParse({
        target_type: "user",
        target_id: "u-123",
        reason: "fraud",
      });
      expect(invalidType.success).toBe(false);

      const invalidId = createReportSchema.safeParse({
        target_type: "item",
        target_id: "",
        reason: "fraud",
      });
      expect(invalidId.success).toBe(false);
    });

    it("validates admin resolution schema", () => {
      const valid = resolveReportSchema.safeParse({
        status: "resolved",
        action_taken: "item_removed",
        admin_notes: "Removed listing due to verified spam.",
      });
      expect(valid.success).toBe(true);
    });

    it("validates post-handover feedback schema", () => {
      const valid = postFeedbackSchema.safeParse({
        claim_id: "claim-101",
        target_user_id: "user-finder",
        rating: "positive",
        tags: ["On Time", "Friendly"],
        comment: "Great experience returning my laptop!",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Moderation Escalation & Audit Trail", () => {
    const mockReporterId = "user-reporter-99";
    const mockAdmin = { id: "admin-1", displayName: "Campus Security Admin" };

    it("creates a report and surfaces it in the moderation queue", async () => {
      const report = await ReportsService.createReport(
        {
          target_type: "claim",
          target_id: "claim-fraud-99",
          reason: "fraud",
          description: "Attempted to claim someone else's AirPods.",
        },
        mockReporterId,
      );

      expect(report.id).toBeDefined();
      expect(report.status).toBe("open");

      const queue = await ReportsService.getReports("open");
      const found = queue.find((r) => r.id === report.id);
      expect(found).toBeDefined();
      expect(found?.reason).toBe("fraud");
    });

    it("resolves a report, performs action, and creates an audit log entry", async () => {
      const report = await ReportsService.createReport(
        {
          target_type: "message",
          target_id: "msg-harass-1",
          reason: "harassment",
          description: "Abusive language in meetup negotiation.",
        },
        mockReporterId,
      );

      const resolved = await ReportsService.resolveReport(
        report.id,
        {
          status: "resolved",
          action_taken: "warning_issued",
          admin_notes: "Issued official warning for community policy violation.",
        },
        mockAdmin,
      );

      expect(resolved?.status).toBe("resolved");
      expect(resolved?.action_taken).toBe("warning_issued");
      expect(resolved?.resolved_by).toBe(mockAdmin.id);

      // Verify audit logs
      const logs = ReportsService.getAuditLogs();
      const auditEntry = logs.find((l) => l.target_id === "msg-harass-1");
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.admin_id).toBe(mockAdmin.id);
      expect(auditEntry?.action).toContain("RESOLVED");
    });
  });

  describe("Reputation & Trust Badges Calculation", () => {
    const mockStudentUser: UserRecord = {
      id: "student-user-trust",
      email: "alex@university.edu",
      passwordHash: "hash",
      displayName: "Alex T.",
      role: "user",
      studentId: "STU-8877",
      isStudentVerified: true,
      createdAt: new Date().toISOString(),
    };

    it("computes verified student trust badge and score", () => {
      store.addUser(mockStudentUser);
      const rep = ReportsService.getUserReputation(mockStudentUser.id);

      expect(rep.isStudentVerified).toBe(true);
      expect(rep.trustScore).toBeGreaterThanOrEqual(50);
      expect(rep.badges.some((b) => b.id === "verified_student")).toBe(true);
    });

    it("records handover feedback and boosts reputation", async () => {
      await ReportsService.addFeedback(
        {
          claim_id: "claim-test-feedback",
          target_user_id: mockStudentUser.id,
          rating: "positive",
          tags: ["Safe Public Location", "Fast Communication"],
          comment: "Super smooth return!",
        },
        "counterpart-user",
      );

      const updatedRep = ReportsService.getUserReputation(mockStudentUser.id);
      expect(updatedRep.positiveFeedbackCount).toBeGreaterThanOrEqual(1);
    });
  });
});
