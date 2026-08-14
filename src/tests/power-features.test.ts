import { describe, it, expect } from "vitest";
import { WatchlistService } from "../../backend/src/services/watchlist.service";
import { NotificationsService } from "../../backend/src/services/notifications.service";
import { OcrService } from "../../backend/src/services/ocr.service";
import { store, ItemRecord } from "../../backend/src/db/store";

describe("Enterprise Power Features: Watchlists, Multi-Channel, OCR & Offline", () => {
  describe("Saved Searches & Watchlists", () => {
    const subscriberUserId = "watchlist-subscriber-1";
    const posterUserId = "item-poster-2";

    it("creates a saved search watchlist and matches new incoming listings", async () => {
      // 1. Create a watchlist for "Casio" calculator
      const watchlist = WatchlistService.create(subscriberUserId, {
        name: "Lost Casio FX991",
        keyword: "Casio",
        category: "Electronics",
        campus_zone: "library",
        item_type: "found",
        notify_in_app: true,
        notify_email: true,
      });

      expect(watchlist.id).toBeDefined();
      expect(watchlist.name).toBe("Lost Casio FX991");

      // 2. Post a non-matching item (different category / keyword)
      const nonMatchingItem: ItemRecord = {
        id: "item-non-match-1",
        title: "Nike Water Bottle",
        description: "Red sports bottle.",
        category: "Lab & Sports Gear",
        campus_zone: "sports",
        item_type: "found",
        location: "Gym Court",
        date_occurred: "2026-08-14",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: posterUserId,
        poster_name: "Finder",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.addItem(nonMatchingItem);

      const nonMatchResult = await WatchlistService.evaluateNewItem(nonMatchingItem);
      expect(nonMatchResult).toBe(0);

      // 3. Post a matching item
      const matchingItem: ItemRecord = {
        id: "item-matching-casio-1",
        title: "Casio Calculator fx-991EX",
        description: "Black scientific calculator found on desk.",
        category: "Electronics",
        campus_zone: "library",
        item_type: "found",
        location: "Library 2nd floor",
        date_occurred: "2026-08-14",
        image_url: null,
        status: "open",
        contact_info: null,
        posted_by: posterUserId,
        poster_name: "Finder",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.addItem(matchingItem);

      const matchResult = await WatchlistService.evaluateNewItem(matchingItem);
      expect(matchResult).toBeGreaterThanOrEqual(1);

      // Verify subscriber received watchlist notification
      const userNotifs = await NotificationsService.getByUserId(subscriberUserId);
      const alert = userNotifs.find((n) => n.text.includes("Casio Calculator"));
      expect(alert).toBeDefined();
      expect(alert?.link).toBe(`/items/${matchingItem.id}`);
    });
  });

  describe("Multi-Channel Notifications & Preferences", () => {
    const testUserId = "user-pref-test-1";

    it("gets default preferences and updates channel settings", () => {
      const prefs = NotificationsService.getPreferences(testUserId);
      expect(prefs.in_app).toBe(true);
      expect(prefs.email).toBe(true);

      const updated = NotificationsService.updatePreferences(testUserId, {
        whatsapp: true,
        phone_number: "+2348012345678",
        notify_on_watchlist: false,
      });

      expect(updated.whatsapp).toBe(true);
      expect(updated.phone_number).toBe("+2348012345678");
      expect(updated.notify_on_watchlist).toBe(false);
    });

    it("respects notification preference filters", async () => {
      // Disabling watchlist alerts for this user
      NotificationsService.updatePreferences(testUserId, {
        notify_on_watchlist: false,
      });

      const sent = await NotificationsService.notify({
        user_id: testUserId,
        text: "Suppressed Watchlist Notification",
        type: "watchlist",
      });

      expect(sent).toBeNull();
    });
  });

  describe("OCR & Serial / ID Text Extraction", () => {
    it("extracts Student Matriculation ID numbers from optical text", () => {
      const sampleText = "FACULTY OF ENGINEERING MATRIC NO: ENG/2021/0491 STUDENT IDENTITY CARD";
      const result = OcrService.extractEntities(sampleText);

      expect(result.studentId).toBe("ENG/2021/0491");
      expect(result.suggestedTitle).toContain("Student ID Card");
      expect(result.sensitiveDetailFragment).toContain("ENG/2021/0491");
    });

    it("extracts Serial number, Brand, and Model from electronic photos", () => {
      const sampleText = "Apple MacBook Pro Model A2485 S/N: C02G894MD6R";
      const result = OcrService.extractEntities(sampleText);

      expect(result.brand).toBe("Apple");
      expect(result.model).toBe("A2485");
      expect(result.serialNumber).toBe("C02G894MD6R");
      expect(result.suggestedTitle).toBe("Apple A2485");
    });
  });
});
