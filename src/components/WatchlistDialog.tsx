import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, Bell, Sparkles, Loader2, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface WatchlistDialogProps {
  currentFilters: {
    keyword?: string | undefined;
    category?: string | undefined;
    campusZone?: string | undefined;
    type?: string | undefined;
  };
}

export function WatchlistDialog({ currentFilters }: WatchlistDialogProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);

  const filterSummary = [
    currentFilters.keyword ? `Keyword: "${currentFilters.keyword}"` : null,
    currentFilters.category && currentFilters.category !== "any"
      ? `Category: ${currentFilters.category}`
      : null,
    currentFilters.campusZone && currentFilters.campusZone !== "all"
      ? `Zone: ${currentFilters.campusZone}`
      : null,
    currentFilters.type && currentFilters.type !== "any" ? `Type: ${currentFilters.type}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const createMutation = useMutation({
    mutationFn: async () => {
      const defaultName =
        name.trim() ||
        (currentFilters.keyword
          ? `${currentFilters.keyword} Alert`
          : currentFilters.category && currentFilters.category !== "any"
            ? `${currentFilters.category} Alert`
            : "Campus Watchlist");

      return api.createWatchlist({
        name: defaultName,
        keyword: currentFilters.keyword?.trim() || null,
        category:
          currentFilters.category && currentFilters.category !== "any"
            ? currentFilters.category
            : null,
        campus_zone:
          currentFilters.campusZone && currentFilters.campusZone !== "all"
            ? currentFilters.campusZone
            : null,
        item_type:
          currentFilters.type === "lost" || currentFilters.type === "found"
            ? currentFilters.type
            : null,
        notify_in_app: notifyInApp,
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
      });
    },
    onSuccess: () => {
      toast.success("Saved search alert created! We will notify you when matching items appear.");
      void qc.invalidateQueries({ queryKey: ["watchlists"] });
      setOpen(false);
      setName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1.5"
        >
          <Bookmark className="size-3.5" /> Save Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            Create Saved Search Watchlist
          </DialogTitle>
          <DialogDescription>
            Get notified instantly across your chosen channels whenever a matching item is reported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-xl border bg-muted/40 p-3 text-xs">
            <span className="font-semibold text-foreground">Captured Criteria:</span>
            <p className="mt-1 text-muted-foreground">
              {filterSummary || "All new listings across entire campus"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchlist-name">Watchlist Name</Label>
            <Input
              id="watchlist-name"
              placeholder="e.g. Lost AirPods near Library"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Alert Channels:
            </Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={notifyInApp}
                  onCheckedChange={(c) => setNotifyInApp(Boolean(c))}
                />
                <span>🔔 In-App Notifications</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={notifyEmail}
                  onCheckedChange={(c) => setNotifyEmail(Boolean(c))}
                />
                <span>📧 Instant Email Alert</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={notifyWhatsapp}
                  onCheckedChange={(c) => setNotifyWhatsapp(Boolean(c))}
                />
                <span>💬 WhatsApp / SMS Nudge</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Save Watchlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
