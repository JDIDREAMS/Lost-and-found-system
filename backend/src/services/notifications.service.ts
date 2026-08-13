import { supabaseAdmin } from "../config/supabase.js";
import { store, NotificationRecord } from "../db/store.js";

export class NotificationsService {
  static async getByUserId(userId: string): Promise<NotificationRecord[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as NotificationRecord[];
    } catch {
      // fallback
    }
    return store.getNotificationsByUserId(userId);
  }

  static async notify(
    notification: Omit<NotificationRecord, "id" | "created_at" | "is_read">,
  ): Promise<NotificationRecord> {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: notification.user_id,
          text: notification.text,
          link: notification.link || null,
          is_read: false,
        })
        .select()
        .single();
      if (!error && data) {
        const record = data as NotificationRecord;
        store.addNotification(record);
        return record;
      }
    } catch {
      // fallback
    }

    const newRecord: NotificationRecord = {
      id: crypto.randomUUID(),
      user_id: notification.user_id,
      text: notification.text,
      link: notification.link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    store.addNotification(newRecord);
    return newRecord;
  }

  static async markRead(id: string, userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId);
    } catch {
      // fallback
    }
    store.markNotificationRead(id, userId);
  }

  static async markAllRead(userId: string): Promise<void> {
    try {
      await supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
    } catch {
      // fallback
    }
    store.markAllNotificationsRead(userId);
  }
}
