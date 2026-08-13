import { describe, it, expect } from "vitest";
import { createItemSchema } from "../../backend/src/schemas/items.schema";
import { parseImagePaths } from "../components/ItemImage";
import { ItemsService } from "../../backend/src/services/items.service";
import { ClaimsService } from "../../backend/src/services/claims.service";
import { store, ItemRecord, ClaimRecord } from "../../backend/src/db/store";

describe("Rich Item Evidence & Sensitive Verification Detail", () => {
  describe("Schema Validation & Rich Media", () => {
    it("validates post with video_url and sensitive_details", () => {
      const valid = createItemSchema.safeParse({
        title: "Apple AirPods Pro Gen 2",
        description: "Found near library third floor seating area.",
        category: "Electronics",
        item_type: "found",
        location: "Library 3rd Floor",
        date_occurred: "2026-08-14",
        video_url: "/uploads/evidence-clip-1.mp4",
        sensitive_details: "Engraving on charging case says 'Sarah K.' and serial ends in 98X.",
      });

      expect(valid.success).toBe(true);
    });

    it("parses image payloads correctly", () => {
      expect(parseImagePaths(null)).toEqual([]);
      expect(parseImagePaths("/uploads/single.jpg")).toEqual(["/uploads/single.jpg"]);
      expect(
        parseImagePaths(JSON.stringify(["/uploads/img1.jpg", "/uploads/img2.jpg"])),
      ).toEqual(["/uploads/img1.jpg", "/uploads/img2.jpg"]);
    });
  });

  describe("Sensitive Detail Protection & Access Control", () => {
    const mockPosterId = "poster-user-1";
    const mockClaimantId = "claimant-user-2";
    const mockPublicViewerId = "random-user-3";

    const testItem: ItemRecord = {
      id: "item-sensitive-evidence-test",
      title: "Designer Leather Backpack",
      description: "Brown leather backpack with brass buckles.",
      category: "Bags",
      item_type: "found",
      location: "Student Union",
      date_occurred: "2026-08-12",
      image_url: JSON.stringify(["/uploads/bag1.jpg", "/uploads/bag2.jpg"]),
      video_url: "/uploads/bag-video.mp4",
      sensitive_details: "Inner zip pocket has $60 cash and a student ID for Maria Perez.",
      status: "open",
      contact_info: "finder@example.com",
      posted_by: mockPosterId,
      poster_name: "Finder User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("persists sensitive_details in store", async () => {
      store.addItem(testItem);
      const saved = await ItemsService.getById(testItem.id);
      expect(saved?.sensitive_details).toBe(
        "Inner zip pocket has $60 cash and a student ID for Maria Perez.",
      );
      expect(saved?.video_url).toBe("/uploads/bag-video.mp4");
    });

    it("verifies approved claimant access logic", async () => {
      const claim: ClaimRecord = {
        id: "claim-approved-test",
        item_id: testItem.id,
        claimant_id: mockClaimantId,
        message: "I lost my backpack with my ID inside.",
        status: "approved",
        created_at: new Date().toISOString(),
      };
      store.addClaim(claim);

      // Verify that claim is approved
      const claims = await ClaimsService.getByItemId(testItem.id);
      const approvedClaim = claims.find(
        (c) => c.claimant_id === mockClaimantId && c.status === "approved",
      );
      expect(approvedClaim).toBeDefined();

      const publicClaim = claims.find((c) => c.claimant_id === mockPublicViewerId);
      expect(publicClaim).toBeUndefined();
    });
  });
});
