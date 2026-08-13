import { describe, it, expect } from "vitest";
import { proposeMeetupSchema, respondMeetupSchema } from "../../backend/src/schemas/claims.schema";
import { ClaimsService } from "../../backend/src/services/claims.service";
import { store, ClaimRecord } from "../../backend/src/db/store";

describe("Safe Handover Scheduler & Dual Confirmation", () => {
  describe("Meetup Proposal Schemas", () => {
    it("validates a proper meetup proposal at a campus safe zone", () => {
      const valid = proposeMeetupSchema.safeParse({
        location: "Campus Security Main Post (24/7 Monitored)",
        scheduled_time: "2026-08-15T14:30:00Z",
        notes: "I'll be standing by the front desk with a black backpack.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects proposals with empty location", () => {
      const invalid = proposeMeetupSchema.safeParse({
        location: "",
        scheduled_time: "2026-08-15T14:30:00Z",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates response to meetup proposal", () => {
      const accept = respondMeetupSchema.safeParse({ status: "accepted" });
      const decline = respondMeetupSchema.safeParse({ status: "declined" });
      const invalid = respondMeetupSchema.safeParse({ status: "maybe" });

      expect(accept.success).toBe(true);
      expect(decline.success).toBe(true);
      expect(invalid.success).toBe(false);
    });
  });

  describe("Dual-Party Handover Completion Workflow", () => {
    const mockClaimId = "claim-handover-test";
    const mockClaim: ClaimRecord = {
      id: mockClaimId,
      item_id: "item-123",
      claimant_id: "user-claimant",
      message: "This is my lost wallet with student ID.",
      status: "approved",
      created_at: new Date().toISOString(),
    };

    it("requires BOTH poster and claimant to confirm before completing", async () => {
      store.addClaim(mockClaim);

      // 1. Poster confirms handoff
      const step1 = await ClaimsService.confirmHandover(
        mockClaimId,
        "user-poster",
        true, // isPoster = true
      );

      expect(step1.isFullyCompleted).toBe(false);
      expect(step1.claim?.handover?.poster_confirmed).toBe(true);
      expect(step1.claim?.handover?.claimant_confirmed).toBe(false);

      // 2. Claimant confirms receipt
      const step2 = await ClaimsService.confirmHandover(
        mockClaimId,
        "user-claimant",
        false, // isPoster = false
      );

      expect(step2.isFullyCompleted).toBe(true);
      expect(step2.claim?.handover?.poster_confirmed).toBe(true);
      expect(step2.claim?.handover?.claimant_confirmed).toBe(true);
      expect(step2.claim?.handover?.completed_at).toBeDefined();
    });
  });
});
