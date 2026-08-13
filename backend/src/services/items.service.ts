import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, ItemRecord } from "../db/store.js";

export class ItemsService {
  static async getAll(filters?: {
    keyword?: string;
    category?: string;
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

    // 2. Load from in-memory / JSON store (ensuring locally posted items are always present)
    for (const item of store.getItems()) {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }

    let items = Array.from(combinedMap.values());

    // Sort by created_at descending
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
    if (filters?.status && filters.status !== "any") {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters?.keyword) {
      const kw = filters.keyword.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(kw) ||
          i.description.toLowerCase().includes(kw) ||
          i.location.toLowerCase().includes(kw),
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
    const newRecord: ItemRecord = {
      id: crypto.randomUUID(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
          location: item.location,
          date_occurred: item.date_occurred,
          image_url: item.image_url,
          video_url: item.video_url,
          sensitive_details: item.sensitive_details,
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
          video_url: item.video_url || null,
          sensitive_details: item.sensitive_details || null,
        };
      }
    } catch {
      // ignore
    }

    return newRecord;
  }

  static async update(
    id: string,
    updates: Partial<ItemRecord>,
    userToken?: string,
  ): Promise<ItemRecord | null> {
    // Update local store
    const updatedLocal = store.updateItem(id, updates);

    // Attempt to update Supabase
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
