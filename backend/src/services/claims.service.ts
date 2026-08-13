import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, ClaimRecord } from "../db/store.js";

export class ClaimsService {
  static async getByItemId(itemId: string): Promise<ClaimRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("claims")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as ClaimRecord[];
    } catch {
      // fallback
    }
    return store.getClaims().filter((c) => c.item_id === itemId);
  }

  static async getById(claimId: string): Promise<ClaimRecord | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();
      if (!error && data) return data as ClaimRecord;
    } catch {
      // fallback
    }
    return store.getClaimById(claimId) || null;
  }

  static async create(
    claim: Omit<ClaimRecord, "id" | "created_at">,
    userToken?: string,
  ): Promise<ClaimRecord> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { data, error } = await client
        .from("claims")
        .insert({
          item_id: claim.item_id,
          claimant_id: claim.claimant_id,
          message: claim.message,
          status: claim.status || "pending",
        })
        .select()
        .single();

      if (!error && data) {
        const record = data as ClaimRecord;
        store.addClaim(record);
        return record;
      }
    } catch {
      // fallback
    }

    const newRecord: ClaimRecord = {
      id: crypto.randomUUID(),
      ...claim,
      created_at: new Date().toISOString(),
    };
    store.addClaim(newRecord);
    return newRecord;
  }

  static async updateStatus(
    id: string,
    status: "pending" | "approved" | "rejected",
    userToken?: string,
  ): Promise<ClaimRecord | null> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { data, error } = await client
        .from("claims")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const record = data as ClaimRecord;
        store.updateClaim(id, { status });
        return record;
      }
    } catch {
      // fallback
    }

    return store.updateClaim(id, { status });
  }
}
