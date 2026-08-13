import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, ItemRecord } from "../db/store.js";

export class ItemsService {
  static async getAll(filters?: {
    keyword?: string;
    category?: string;
    item_type?: "lost" | "found";
    status?: string;
  }): Promise<ItemRecord[]> {
    try {
      let query = supabaseAdmin.from("items").select("*").order("created_at", { ascending: false });

      if (filters?.item_type && filters.item_type !== ("any" as unknown)) {
        query = query.eq("item_type", filters.item_type);
      }
      if (filters?.category && filters.category !== "any") {
        query = query.eq("category", filters.category);
      }
      if (filters?.status && filters.status !== "any") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (!error && data) {
        if (filters?.keyword) {
          const kw = filters.keyword.toLowerCase();
          return data.filter(
            (i) =>
              i.title.toLowerCase().includes(kw) ||
              i.description.toLowerCase().includes(kw) ||
              i.location.toLowerCase().includes(kw),
          );
        }
        return data as ItemRecord[];
      }
    } catch {
      // fallback to store
    }

    let items = store.getItems();
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
      const { data, error } = await supabaseAdmin
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) return data as ItemRecord;
    } catch {
      // fallback
    }
    return store.getItemById(id) || null;
  }

  static async create(
    item: Omit<ItemRecord, "id" | "created_at" | "updated_at">,
    userToken?: string,
  ): Promise<ItemRecord> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { data, error } = await client
        .from("items")
        .insert({
          title: item.title,
          description: item.description,
          category: item.category,
          item_type: item.item_type,
          location: item.location,
          date_occurred: item.date_occurred,
          image_url: item.image_url,
          status: item.status || "open",
          contact_info: item.contact_info,
          posted_by: item.posted_by,
          poster_name: item.poster_name,
        })
        .select()
        .single();

      if (!error && data) {
        const record = data as ItemRecord;
        store.addItem(record);
        return record;
      }
    } catch {
      // fallback
    }

    const newRecord: ItemRecord = {
      id: crypto.randomUUID(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.addItem(newRecord);
    return newRecord;
  }

  static async update(
    id: string,
    updates: Partial<ItemRecord>,
    userToken?: string,
  ): Promise<ItemRecord | null> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { data, error } = await client
        .from("items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const record = data as ItemRecord;
        store.updateItem(id, updates);
        return record;
      }
    } catch {
      // fallback
    }

    return store.updateItem(id, updates);
  }

  static async delete(id: string, userToken?: string): Promise<boolean> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { error } = await client.from("items").delete().eq("id", id);
      if (!error) {
        store.deleteItem(id);
        return true;
      }
    } catch {
      // fallback
    }
    return store.deleteItem(id);
  }
}
