import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/lostfound";

interface NotificationRow {
  id: string;
  text: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const load = async () => {
      // 1. Try fetching via user-scoped Express API
      try {
        const { notifications } = await api.getNotifications();
        setItems(notifications);
        return;
      } catch {
        // Fallback to Supabase
      }

      // 2. User-scoped Supabase query
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id, text, link, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setItems(data ?? []);
      } catch {
        setItems([]);
      }
    };

    void load();

    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const unread = items.filter((n) => !n.is_read).length;

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await api.markAllNotificationsRead();
    } catch {
      // Fallback to Supabase scoped to current user
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }
  };

  const markOne = async (n: NotificationRow) => {
    setOpen(false);
    setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));

    try {
      await api.markNotificationRead(n.id);
    } catch {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id)
        .eq("user_id", user.id);
    }

    if (n.link) void navigate({ to: n.link });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => void markAll()}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    className="block w-full px-4 py-3 text-left hover:bg-surface"
                    onClick={() => void markOne(n)}
                  >
                    <span className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                      )}
                      <span className="text-sm">{n.text}</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatDateTime(n.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
