import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, ItemRecord } from "../db/store.js";
import { NotificationsService } from "./notifications.service.js";

export class ItemsService {
  static async getAll(filters?: {
    keyword?: string;
    category?: string;
    campus_zone?: string;
    item_type?: "lost" | "found";
    status?: string;
  }): Promise<ItemRecord[]> {
    const combinedMap = new Map<string, ItemRecord>();

    // 1. Load from Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        for (const item of data as ItemRecord[]) {
          combinedMap.set(item.id, item);
        }
      }
    } catch {
      // ignore
    }

    // 2. Load from in-memory / JSON store
    for (const item of store.getItems()) {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }

    let items = Array.from(combinedMap.values());

    // Sort by created_at descending (bumped items jump to top)
    items.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date_occurred).getTime();
      const dateB = new Date(b.created_at || b.date_occurred).getTime();
      return dateB - dateA;
    });

    // Apply filters
    if (filters?.item_type && filters.item_type !== ("any" as unknown)) {
      items = items.filter((i) => i.item_type === filters.item_type);
    }
    if (filters?.category && filters.category !== "any") {
      items = items.filter((i) => i.category === filters.category);
    }
    if (filters?.campus_zone && filters.campus_zone !== "all" && filters.campus_zone !== "any") {
      items = items.filter((i) => i.campus_zone === filters.campus_zone);
    }
    if (filters?.status && filters.status !== "any" && filters.status !== "all") {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters?.keyword) {
      const kw = filters.keyword.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(kw) ||
          i.description.toLowerCase().includes(kw) ||
          i.location.toLowerCase().includes(kw) ||
          (i.campus_zone && i.campus_zone.toLowerCase().includes(kw)),
      );
    }
    return items;
  }

  static async getById(id: string): Promise<ItemRecord | null> {
    try {
      const { data, error } = await supabaseAdmin.from("items").select("*").eq("id", id).single();
      if (!error && data) return data as ItemRecord;
    } catch {
      // ignore
    }
    return store.getItemById(id) || null;
  }

  static async create(
    item: Omit<ItemRecord, "id" | "created_at" | "updated_at">,
    userToken?: string,
  ): Promise<ItemRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();

    const newRecord: ItemRecord = {
      id: crypto.randomUUID(),
      ...item,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Always persist to local store first
    store.addItem(newRecord);

    // Attempt to persist to Supabase
    try {
      const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
      const { data, error } = await client
        .from("items")
        .insert({
          id: newRecord.id,
          title: item.title,
          description: item.description,
          category: item.category,
          item_type: item.item_type,
          campus_zone: item.campus_zone || null,
          location: item.location,
          date_occurred: item.date_occurred,
          image_url: item.image_url,
          video_url: item.video_url,
          sensitive_details: item.sensitive_details,
          ocr_text: item.ocr_text,
          status: item.status || "open",
          contact_info: item.contact_info,
          posted_by: item.posted_by,
          poster_name: item.poster_name,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...(data as ItemRecord),
          campus_zone: item.campus_zone || null,
          video_url: item.video_url || null,
          sensitive_details: item.sensitive_details || null,
          ocr_text: item.ocr_text || null,
          expires_at: expiresAt,
        };
      }
    } catch {
      // ignore
    }

    return newRecord;
  }

  static async bumpItem(
    id: string,
    userId: string,
    userToken?: string,
  ): Promise<ItemRecord | null> {
    const existing = store.getItemById(id);
    if (!existing) return null;

    if (existing.posted_by !== userId) {
      throw new Error("Only the owner can bump this listing");
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();

    return this.update(
      id,
      {
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        bumped_at: now.toISOString(),
        expires_at: newExpiresAt,
        status: "open",
      },
      userToken,
    );
  }

  static async checkAndExpireStaleItems(): Promise<{
    expiredCount: number;
    nudgedCount: number;
  }> {
    const items = store.getItems();
    const now = Date.now();
    let expiredCount = 0;
    let nudgedCount = 0;

    for (const item of items) {
      if (item.status !== "open") continue;

      const createdTime = new Date(item.created_at).getTime();
      const expiresTime = item.expires_at
        ? new Date(item.expires_at).getTime()
        : createdTime + 30 * 86400000;
      const ageDays = (now - createdTime) / 86400000;

      // 1. Auto-expire if lifespan is over
      if (now >= expiresTime) {
        store.updateItem(item.id, { status: "expired" });
        expiredCount++;

        if (item.posted_by) {
          await NotificationsService.notify({
            user_id: item.posted_by,
            text: `⌛ Your listing "${item.title}" has expired after 30 days. You can renew or bump it anytime.`,
            link: `/dashboard`,
          });
        }
      } else if (ageDays >= 14 && !item.bumped_at && item.posted_by) {
        // 2. 14-day reminder nudge
        await NotificationsService.notify({
          user_id: item.posted_by,
          text: `⏰ Still missing? It's been 14 days since you posted "${item.title}". Bump your listing to keep it on top.`,
          link: `/dashboard`,
        });
        nudgedCount++;
      }
    }

    return { expiredCount, nudgedCount };
  }

  static async update(
    id: string,
    updates: Partial<ItemRecord>,
    userToken?: string,
  ): Promise<ItemRecord | null> {
    const updatedLocal = store.updateItem(id, updates);

    try {
      const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
      const { data, error } = await client
        .from("items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return data as ItemRecord;
      }
    } catch {
      // ignore
    }

    return updatedLocal;
  }

  static async delete(id: string, userToken?: string): Promise<boolean> {
    store.deleteItem(id);

    try {
      const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
      await client.from("items").delete().eq("id", id);
    } catch {
      // ignore
    }
    return true;
  }
}
