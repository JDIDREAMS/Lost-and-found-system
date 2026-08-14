import { describe, it, expect } from "vitest";
import { CAMPUS_ZONES, getDaysRemaining } from "../lib/lostfound";
import { ItemsService } from "../../backend/src/services/items.service";
import { store, ItemRecord } from "../../backend/src/db/store";

describe("Campus Geo-Zones & Post Lifecycle with Expiry and Nudges", () => {
  describe("Campus Geo-Zones", () => {
    it("defines standard campus zones", () => {
      expect(CAMPUS_ZONES.length).toBeGreaterThan(5);
      const libraryZone = CAMPUS_ZONES.find((z) => z.id === "library");
      expect(libraryZone).toBeDefined();
      expect(libraryZone?.label).toContain("Library");
    });

    it("filters items by campus zone", async () => {
      const itemLibrary: ItemRecord = {
        id: "item-geo-lib-test",
        title: "Calculus Textbook",
        description: "Left on table on 3rd floor.",
        category: "Books & Notes",
        item_type: "lost",
        campus_zone: "library",
        location: "Main Library 3rd Floor",
        date_occurred: "2026-08-14",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: "user-geo-1",
        poster_name: "Student 1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const itemSports: ItemRecord = {
        id: "item-geo-sport-test",
        title: "Nike Basketball",
        description: "Left in indoor court.",
        category: "Lab & Sports Gear",
        item_type: "found",
        campus_zone: "sports",
        location: "Gym Court 2",
        date_occurred: "2026-08-14",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: "user-geo-2",
        poster_name: "Student 2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.addItem(itemLibrary);
      store.addItem(itemSports);

      const libItems = await ItemsService.getAll({ campus_zone: "library" });
      expect(libItems.some((i) => i.id === "item-geo-lib-test")).toBe(true);
      expect(libItems.some((i) => i.id === "item-geo-sport-test")).toBe(false);

      const sportItems = await ItemsService.getAll({ campus_zone: "sports" });
      expect(sportItems.some((i) => i.id === "item-geo-sport-test")).toBe(true);
      expect(sportItems.some((i) => i.id === "item-geo-lib-test")).toBe(false);
    });
  });

  describe("Expiry Lifecycle, Bumping & Nudges", () => {
    it("calculates days remaining correctly", () => {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 25 * 86400000).toISOString();
      const past = new Date(Date.now() - 5 * 86400000).toISOString();

      const activeRes = getDaysRemaining(now, future);
      expect(activeRes.isExpired).toBe(false);
      expect(activeRes.days).toBe(25);

      const expiredRes = getDaysRemaining(past, past);
      expect(expiredRes.isExpired).toBe(true);
      expect(expiredRes.text).toBe("Expired");
    });

    it("bumps listing, refreshing timestamps and resetting lifespan", async () => {
      const oldDate = new Date(Date.now() - 20 * 86400000).toISOString();
      const testItem: ItemRecord = {
        id: "item-bump-test-1",
        title: "Sony Headphones",
        description: "Black wireless over-ear headphones.",
        category: "Electronics",
        item_type: "lost",
        location: "Cafeteria",
        date_occurred: "2026-07-20",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: "user-bump-owner",
        poster_name: "Headphone Owner",
        created_at: oldDate,
        updated_at: oldDate,
      };

      store.addItem(testItem);

      // Attempt bump by non-owner should throw
      await expect(ItemsService.bumpItem(testItem.id, "different-user")).rejects.toThrow(
        "Only the owner can bump this listing",
      );

      // Bump by owner should succeed
      const bumped = await ItemsService.bumpItem(testItem.id, "user-bump-owner");
      expect(bumped).toBeDefined();
      expect(bumped?.status).toBe("open");
      expect(bumped?.bumped_at).toBeDefined();
      expect(new Date(bumped!.created_at).getTime()).toBeGreaterThan(new Date(oldDate).getTime());
    });

    it("auto-expires stale posts after lifespan is reached", async () => {
      const expiredDate = new Date(Date.now() - 35 * 86400000).toISOString();
      const staleItem: ItemRecord = {
        id: "item-stale-lifecycle-test",
        title: "Old Blue Umbrella",
        description: "Left near foyer.",
        category: "Other",
        item_type: "lost",
        location: "Admin Block",
        date_occurred: "2026-06-01",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: "user-stale-1",
        poster_name: "Stale Owner",
        created_at: expiredDate,
        updated_at: expiredDate,
        expires_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      };

      store.addItem(staleItem);

      const check = await ItemsService.checkAndExpireStaleItems();
      expect(check.expiredCount).toBeGreaterThanOrEqual(1);

      const itemAfter = store.getItemById(staleItem.id);
      expect(itemAfter?.status).toBe("expired");
    });
  });
});
