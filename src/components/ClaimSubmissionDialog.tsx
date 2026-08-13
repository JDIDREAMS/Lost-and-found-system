import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
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

interface ClaimSubmissionDialogProps {
  itemId: string;
  itemTitle: string;
  onSuccess: () => void;
}

export function ClaimSubmissionDialog({
  itemId,
  itemTitle,
  onSuccess,
}: ClaimSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Structured proof fields
  const [brand, setBrand] = useState("");
  const [uniqueMarks, setUniqueMarks] = useState("");
  const [contents, setContents] = useState("");
  const [serialFragment, setSerialFragment] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error("Please provide at least 10 characters in your proof statement.");
      return;
    }

    setBusy(true);
    try {
      await api.submitClaim(itemId, {
        message: message.trim(),
        brand: brand.trim() || null,
        unique_marks: uniqueMarks.trim() || null,
        contents_description: contents.trim() || null,
        serial_fragment: serialFragment.trim() || null,
      });

      toast.success("Proof of ownership submitted! The poster has been notified.");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit claim.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-medium shadow-sm">
          <ShieldCheck className="size-4" /> Submit Proof of Ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <DialogTitle>Proof of Ownership</DialogTitle>
          </div>
          <DialogDescription>
            Provide identifying details only the rightful owner would know for{" "}
            <strong>"{itemTitle}"</strong>. This protects against false claims.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="size-3.5 text-primary" /> Tips for fast verification:
            </p>
            <p className="mt-1">
              Mention specific scratches, lock screen wallpapers, card types, or serial digits.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-make" className="text-xs">
                Brand / Manufacturer (Optional)
              </Label>
              <Input
                id="brand-make"
                placeholder="e.g. Apple, Fossil, Sony, Nike"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serial-frag" className="text-xs">
                Serial / ID / Card Ending (Optional)
              </Label>
              <Input
                id="serial-frag"
                placeholder="e.g. Last 4 digits: 4892"
                value={serialFragment}
                onChange={(e) => setSerialFragment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unique-marks" className="text-xs">
              Unique Marks, Engravings, or Stickers (Optional)
            </Label>
            <Input
              id="unique-marks"
              placeholder="e.g. Cat sticker on bottom left, scratch near charging port"
              value={uniqueMarks}
              onChange={(e) => setUniqueMarks(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contents-desc" className="text-xs">
              Contents, Interior, or Wallpaper Details (Optional)
            </Label>
            <Input
              id="contents-desc"
              placeholder="e.g. Contains student ID for Alex, blue keychain, 2 keys"
              value={contents}
              onChange={(e) => setContents(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proof-message" className="text-xs">
              Proof Statement &amp; Circumstances of Loss{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="proof-message"
              required
              rows={3}
              placeholder="Describe where and when you last had the item, and any other details proving ownership..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Minimum 10 characters ({message.trim().length}/10)
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={message.trim().length < 10 || busy} className="gap-2">
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Submit Claim
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
