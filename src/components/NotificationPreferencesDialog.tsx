import { useState, useEffect } from "react";
import { toast } from "sonner";
import { BellRing, Mail, MessageSquare, Shield, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";

export function NotificationPreferencesDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [phone, setPhone] = useState("");
  const [notifyClaim, setNotifyClaim] = useState(true);
  const [notifyMessage, setNotifyMessage] = useState(true);
  const [notifyMatch, setNotifyMatch] = useState(true);
  const [notifyHandover, setNotifyHandover] = useState(true);
  const [notifyWatchlist, setNotifyWatchlist] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const res = await api.getNotificationPreferences();
      return res.preferences;
    },
  });

  useEffect(() => {
    if (data) {
      setInApp(data.in_app ?? true);
      setEmail(data.email ?? true);
      setWhatsapp(data.whatsapp ?? false);
      setPhone(data.phone_number || "");
      setNotifyClaim(data.notify_on_claim ?? true);
      setNotifyMessage(data.notify_on_message ?? true);
      setNotifyMatch(data.notify_on_match ?? true);
      setNotifyHandover(data.notify_on_handover ?? true);
      setNotifyWatchlist(data.notify_on_watchlist ?? true);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.updateNotificationPreferences({
        in_app: inApp,
        email,
        whatsapp,
        phone_number: phone.trim() || null,
        notify_on_claim: notifyClaim,
        notify_on_message: notifyMessage,
        notify_on_match: notifyMatch,
        notify_on_handover: notifyHandover,
        notify_on_watchlist: notifyWatchlist,
      });
    },
    onSuccess: () => {
      toast.success("Notification preferences updated.");
      void qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      setOpen(false);
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
          className="border-foreground/20 text-xs flex items-center gap-1.5"
        >
          <BellRing className="size-3.5 text-primary" /> Alert Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" /> Multi-Channel Preferences
          </DialogTitle>
          <DialogDescription>
            Choose how and when you receive real-time campus recovery updates.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Delivery Channels */}
            <div className="space-y-3 rounded-xl border bg-muted/30 p-3.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Notification Channels
              </h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">In-App Inbox</Label>
                  <p className="text-[11px] text-muted-foreground">Notification bell indicator</p>
                </div>
                <Switch checked={inApp} onCheckedChange={setInApp} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Email Alerts</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Delivered to your student email
                  </p>
                </div>
                <Switch checked={email} onCheckedChange={setEmail} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">WhatsApp / SMS Direct</Label>
                  <p className="text-[11px] text-muted-foreground">For urgent claims & handovers</p>
                </div>
                <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
              </div>

              {whatsapp && (
                <div className="pt-2">
                  <Label htmlFor="pref-phone" className="text-xs">
                    WhatsApp Phone Number
                  </Label>
                  <Input
                    id="pref-phone"
                    placeholder="+2348012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Triggers */}
            <div className="space-y-3 rounded-xl border bg-muted/30 p-3.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Notification Triggers
              </h4>

              <div className="flex items-center justify-between">
                <span className="text-xs">Claim status updates</span>
                <Switch checked={notifyClaim} onCheckedChange={setNotifyClaim} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Direct chat messages</span>
                <Switch checked={notifyMessage} onCheckedChange={setNotifyMessage} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Smart AI match suggestions</span>
                <Switch checked={notifyMatch} onCheckedChange={setNotifyMatch} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Safe handover meetup proposals</span>
                <Switch checked={notifyHandover} onCheckedChange={setNotifyHandover} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs">Saved search watchlist matches</span>
                <Switch checked={notifyWatchlist} onCheckedChange={setNotifyWatchlist} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="size-4" /> Save Preferences
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
