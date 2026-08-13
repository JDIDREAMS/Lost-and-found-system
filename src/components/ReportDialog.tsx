import { useState } from "react";
import { toast } from "sonner";
import { Flag, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface ReportDialogProps {
  targetType: "item" | "claim" | "message";
  targetId: string;
  targetTitle?: string;
  triggerButton?: React.ReactNode;
}

const REPORT_REASONS = [
  { id: "fraud", label: "Fraudulent listing or suspicious poster" },
  { id: "fake_claim", label: "Fake claim or fabricated ownership proof" },
  { id: "harassment", label: "Harassment, threats, or abusive messages" },
  { id: "inappropriate", label: "Inappropriate, explicit, or offensive content" },
  { id: "spam", label: "Spam, duplicate post, or commercial promo" },
  { id: "other", label: "Other rule violation" },
] as const;

export function ReportDialog({
  targetType,
  targetId,
  targetTitle,
  triggerButton,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]!.id);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.createReport({
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason as
          "fraud" | "fake_claim" | "harassment" | "inappropriate" | "spam" | "other",
        description: description.trim() || null,
      });

      toast.success(
        "Report submitted to campus moderation team. Thank you for keeping our community safe.",
      );
      setOpen(false);
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Flag className="size-3.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-4" />
            </div>
            <DialogTitle>Report {targetType}</DialogTitle>
          </div>
          <DialogDescription>
            Flag this {targetType} {targetTitle ? `("${targetTitle}")` : ""} for investigation by
            the campus administration and moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Reason
            </Label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-all ${
                    selectedReason === r.id
                      ? "border-destructive/60 bg-destructive/10 font-medium text-foreground"
                      : "border-border/70 hover:bg-surface text-muted-foreground"
                  }`}
                >
                  <span>{r.label}</span>
                  {selectedReason === r.id && (
                    <AlertTriangle className="size-3.5 text-destructive" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-desc" className="text-xs font-semibold">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="report-desc"
              rows={3}
              placeholder="Explain why this content violates community guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Flag className="size-3.5" /> Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
