import { describe, it, expect } from "vitest";
import { SmartMatcherService } from "../../backend/src/services/matcher.service";
import { ItemRecord } from "../../backend/src/db/store";

describe("SmartMatcherService Matching Logic", () => {
  const baseLostItem: ItemRecord = {
    id: "item-1",
    title: "Black Leather Fossil Wallet with Student ID",
    description: "Lost my black leather wallet in the main library 2nd floor study area. Contains student card.",
    category: "Wallets",
    item_type: "lost",
    location: "Main Library 2nd Floor",
    date_occurred: "2026-08-10",
    image_url: null,
    status: "open",
    contact_info: "alex@university.edu",
    posted_by: "user-1",
    poster_name: "Alex",
    created_at: "2026-08-10T10:00:00Z",
    updated_at: "2026-08-10T10:00:00Z",
  };

  const matchingFoundItem: ItemRecord = {
    id: "item-2",
    title: "Found Black Leather Wallet",
    description: "Found a black fossil wallet with cards inside at the library.",
    category: "Wallets",
    item_type: "found",
    location: "Main Library",
    date_occurred: "2026-08-10",
    image_url: null,
    status: "open",
    contact_info: "finder@university.edu",
    posted_by: "user-2",
    poster_name: "Sam",
    created_at: "2026-08-10T14:00:00Z",
    updated_at: "2026-08-10T14:00:00Z",
  };

  const unrelatedFoundItem: ItemRecord = {
    id: "item-3",
    title: "Found Silver MacBook Air",
    description: "Apple laptop found in Science Building Room 301.",
    category: "Electronics",
    item_type: "found",
    location: "Science Complex",
    date_occurred: "2026-07-01",
    image_url: null,
    status: "open",
    contact_info: null,
    posted_by: "user-3",
    poster_name: "Jordan",
    created_at: "2026-07-01T10:00:00Z",
    updated_at: "2026-07-01T10:00:00Z",
  };

  it("should score a high-confidence match for matching wallet listings", () => {
    const match = SmartMatcherService.computeMatch(baseLostItem, matchingFoundItem);
    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThanOrEqual(70);
    expect(match!.confidence).toBe("high");
    expect(match!.reasons.length).toBeGreaterThan(0);
  });

  it("should reject matches between items of the exact same type", () => {
    const anotherLostItem: ItemRecord = {
      ...matchingFoundItem,
      id: "item-4",
      item_type: "lost",
    };
    const match = SmartMatcherService.computeMatch(baseLostItem, anotherLostItem);
    expect(match).toBeNull();
  });

  it("should reject matches if the candidate item is already claimed or resolved", () => {
    const claimedFoundItem: ItemRecord = {
      ...matchingFoundItem,
      id: "item-5",
      status: "claimed",
    };
    const match = SmartMatcherService.computeMatch(baseLostItem, claimedFoundItem);
    expect(match).toBeNull();
  });

  it("should reject matching items posted by the same user", () => {
    const sameUserItem: ItemRecord = {
      ...matchingFoundItem,
      posted_by: "user-1",
    };
    const match = SmartMatcherService.computeMatch(baseLostItem, sameUserItem);
    expect(match).toBeNull();
  });

  it("should score low/medium for completely unrelated items", () => {
    const match = SmartMatcherService.computeMatch(baseLostItem, unrelatedFoundItem);
    if (match) {
      expect(match.score).toBeLessThan(40);
      expect(match.confidence).toBe("low");
    }
  });

  it("should award higher date score for closer occurrence dates", () => {
    const closeDateItem: ItemRecord = {
      ...matchingFoundItem,
      id: "item-close",
      date_occurred: "2026-08-11", // 1 day apart
    };
    const farDateItem: ItemRecord = {
      ...matchingFoundItem,
      id: "item-far",
      date_occurred: "2026-09-20", // > 30 days apart
    };

    const matchClose = SmartMatcherService.computeMatch(baseLostItem, closeDateItem);
    const matchFar = SmartMatcherService.computeMatch(baseLostItem, farDateItem);

    expect(matchClose!.score).toBeGreaterThan(matchFar!.score);
  });
});
