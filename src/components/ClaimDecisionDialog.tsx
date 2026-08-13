import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
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

interface ClaimDecisionDialogProps {
  claimId: string;
  itemTitle: string;
  mode: "approved" | "rejected";
  onSuccess: () => void;
  triggerButton?: React.ReactNode;
}

const APPROVAL_TEMPLATES = [
  "Details and identifying marks match physical item perfectly. Verified as rightful owner.",
  "Proof verified. Please meet at Campus Security / Library front desk for safe handover.",
  "Serial number fragment and unique marks match. Ready for collection.",
  "Verification confirmed. Please reply in our chat thread to arrange pickup time.",
];

const REJECTION_TEMPLATES = [
  "Provided marks and identifying details did not match the physical item.",
  "Insufficient proof provided to conclusively verify ownership.",
  "Serial number / card ending digits provided do not match the item.",
  "This item has already been verified and returned to its rightful owner.",
];

export function ClaimDecisionDialog({
  claimId,
  itemTitle,
  mode,
  onSuccess,
  triggerButton,
}: ClaimDecisionDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isApprove = mode === "approved";
  const templates = isApprove ? APPROVAL_TEMPLATES : REJECTION_TEMPLATES;

  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0]!);
  const [customNote, setCustomNote] = useState<string>(templates[0]!);

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    setCustomNote(template);
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.updateClaimStatus(claimId, mode, customNote.trim() || null);
      toast.success(
        isApprove
          ? "Claim approved! The claimant has been notified with pickup details."
          : "Claim rejected with reason note.",
      );
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update claim status.");
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
            variant={isApprove ? "default" : "outline"}
            className={
              isApprove
                ? "gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                : "gap-1.5 text-destructive hover:bg-destructive/10"
            }
          >
            {isApprove ? (
              <>
                <CheckCircle2 className="size-3.5" /> Approve Claim
              </>
            ) : (
              <>
                <XCircle className="size-3.5" /> Reject Claim
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full ${
                isApprove
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isApprove ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            </div>
            <DialogTitle>{isApprove ? "Approve Claim" : "Reject Claim"}</DialogTitle>
          </div>
          <DialogDescription>
            {isApprove
              ? `Confirm ownership for "${itemTitle}" and provide collection instructions.`
              : `State the reason for rejecting this claim on "${itemTitle}".`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDecision} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Reason Template
            </Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {templates.map((tpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleTemplateSelect(tpl)}
                  className={`w-full rounded-lg border p-2.5 text-left text-xs transition-all ${
                    selectedTemplate === tpl
                      ? "border-primary bg-primary/10 font-medium text-foreground"
                      : "border-border/70 hover:border-border hover:bg-surface text-muted-foreground"
                  }`}
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-note" className="text-xs font-semibold">
              Message to Claimant (Editable)
            </Label>
            <Textarea
              id="custom-note"
              rows={3}
              placeholder="Add any specific pickup details or explanation..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className={
                isApprove
                  ? "gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              }
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Updating...
                </>
              ) : isApprove ? (
                <>
                  <CheckCircle2 className="size-4" /> Confirm Approval
                </>
              ) : (
                <>
                  <XCircle className="size-4" /> Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
