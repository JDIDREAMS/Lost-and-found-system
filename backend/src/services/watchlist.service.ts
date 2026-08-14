import { store, WatchlistRecord, ItemRecord } from "../db/store.js";
import { NotificationsService } from "./notifications.service.js";
import { CreateWatchlistInput } from "../schemas/watchlist.schema.js";

export class WatchlistService {
  static getByUserId(userId: string): WatchlistRecord[] {
    return store.getWatchlists(userId);
  }

  static create(userId: string, input: CreateWatchlistInput): WatchlistRecord {
    const record: WatchlistRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: input.name,
      keyword: input.keyword ? input.keyword.trim() : null,
      category: input.category && input.category !== "any" ? input.category : null,
      campus_zone:
        input.campus_zone && input.campus_zone !== "all" && input.campus_zone !== "any"
          ? input.campus_zone
          : null,
      item_type: input.item_type || null,
      notify_email: input.notify_email ?? true,
      notify_in_app: input.notify_in_app ?? true,
      notify_whatsapp: input.notify_whatsapp ?? false,
      created_at: new Date().toISOString(),
    };

    return store.addWatchlist(record);
  }

  static delete(id: string, userId: string): boolean {
    return store.deleteWatchlist(id, userId);
  }

  static async evaluateNewItem(item: ItemRecord): Promise<number> {
    const allWatchlists = store.getWatchlists();
    let matchCount = 0;

    for (const w of allWatchlists) {
      // Don't notify the user who posted the item
      if (w.user_id === item.posted_by) continue;

      // 1. Check item_type match (if watchlist targets found items or lost items)
      if (w.item_type && w.item_type !== item.item_type) continue;

      // 2. Check category
      if (w.category && w.category !== item.category) continue;

      // 3. Check campus zone
      if (w.campus_zone && item.campus_zone && w.campus_zone !== item.campus_zone) {
        continue;
      }

      // 4. Check keyword match against title, description, location, or OCR text
      if (w.keyword) {
        const kw = w.keyword.toLowerCase();
        const fullText =
          `${item.title} ${item.description} ${item.location} ${item.ocr_text || ""}`.toLowerCase();
        if (!fullText.includes(kw)) continue;
      }

      // Match found! Dispatch watchlist notification
      await NotificationsService.notify({
        user_id: w.user_id,
        text: `👀 Watchlist Match: A new ${item.item_type} listing "${item.title}" matches your "${w.name}" watchlist!`,
        link: `/items/${item.id}`,
        type: "watchlist",
      });

      matchCount++;
    }

    return matchCount;
  }
}
