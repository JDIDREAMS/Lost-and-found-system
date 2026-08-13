import { supabaseAdmin, createScopedClient } from "../config/supabase.js";
import { store, MessageRecord } from "../db/store.js";

export class MessagesService {
  static async getByClaimId(claimId: string): Promise<MessageRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("messages")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (!error && data) return data as MessageRecord[];
    } catch {
      // fallback
    }
    return store.getMessagesByClaimId(claimId);
  }

  static async send(
    message: Omit<MessageRecord, "id" | "created_at" | "is_read">,
    userToken?: string,
  ): Promise<MessageRecord> {
    const client = userToken ? createScopedClient(userToken) : supabaseAdmin;
    try {
      const { data, error } = await client
        .from("messages")
        .insert({
          claim_id: message.claim_id,
          sender_id: message.sender_id,
          text: message.text,
          is_read: false,
        })
        .select()
        .single();

      if (!error && data) {
        const record = data as MessageRecord;
        store.addMessage(record);
        return record;
      }
    } catch {
      // fallback
    }

    const newRecord: MessageRecord = {
      id: crypto.randomUUID(),
      claim_id: message.claim_id,
      sender_id: message.sender_id,
      text: message.text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    store.addMessage(newRecord);
    return newRecord;
  }
}
