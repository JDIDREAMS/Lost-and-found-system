import { supabaseAdmin } from "../config/supabase.js";
import { store, NotificationRecord, NotificationPreferencesRecord } from "../db/store.js";

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

  static getPreferences(userId: string): NotificationPreferencesRecord {
    return store.getPreferences(userId);
  }

  static updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferencesRecord>,
  ): NotificationPreferencesRecord {
    return store.setPreferences(userId, updates);
  }

  static async notify(notification: {
    user_id: string;
    text: string;
    link?: string | null;
    type?: "claim" | "message" | "match" | "handover" | "watchlist" | "system";
  }): Promise<NotificationRecord | null> {
    const prefs = store.getPreferences(notification.user_id);

    // Filter based on user preference trigger
    if (notification.type === "claim" && prefs.notify_on_claim === false) return null;
    if (notification.type === "message" && prefs.notify_on_message === false) return null;
    if (notification.type === "match" && prefs.notify_on_match === false) return null;
    if (notification.type === "handover" && prefs.notify_on_handover === false) return null;
    if (notification.type === "watchlist" && prefs.notify_on_watchlist === false) return null;

    let inAppRecord: NotificationRecord | null = null;

    // 1. In-App Notification Channel
    if (prefs.in_app !== false) {
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
          inAppRecord = record;
        }
      } catch {
        // fallback
      }

      if (!inAppRecord) {
        inAppRecord = {
          id: crypto.randomUUID(),
          user_id: notification.user_id,
          text: notification.text,
          link: notification.link || null,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        store.addNotification(inAppRecord);
      }
    }

    // 2. Email Channel (Simulated / Pluggable)
    if (prefs.email) {
      // In production or tests, records email dispatch log
      console.log(
        `[Multi-Channel Dispatcher] 📧 Email to User ${notification.user_id}: "${notification.text}" (Link: ${notification.link || "N/A"})`,
      );
    }

    // 3. WhatsApp / SMS Channel (Direct routing)
    if (prefs.whatsapp && prefs.phone_number) {
      console.log(
        `[Multi-Channel Dispatcher] 💬 WhatsApp to ${prefs.phone_number}: "${notification.text}"`,
      );
    }

    return (
      inAppRecord || {
        id: crypto.randomUUID(),
        user_id: notification.user_id,
        text: notification.text,
        link: notification.link || null,
        is_read: false,
        created_at: new Date().toISOString(),
      }
    );
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
      await supabaseAdmin.from("notifications").update({ is_read: true }).eq("user_id", userId);
    } catch {
      // fallback
    }
    store.markAllNotificationsRead(userId);
  }
}
