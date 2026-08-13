import { useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  PartyPopper,
  Handshake,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquareHeart,
} from "lucide-react";
import { api, MeetupProposal, HandoverStatus } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { formatDateTime } from "@/lib/lostfound";

interface HandoverSchedulerProps {
  claimId: string;
  itemTitle: string;
  isOwner: boolean;
  userId: string;
  counterpartId?: string | null | undefined;
  meetup?: MeetupProposal | null | undefined;
  handover?: HandoverStatus | null | undefined;
  onUpdate: () => void;
}

const SAFE_LOCATION_PRESETS = [
  "Campus Security Main Post (24/7 Monitored)",
  "Main Library Front Circulation Desk",
  "Student Union Info & Help Desk",
  "Central Administration Foyer",
  "Science Complex Ground Floor Lobby",
];

const FEEDBACK_TAGS = [
  "On Time ⏱️",
  "Safe Public Location 🛡️",
  "Friendly & Courteous 😊",
  "Item In Expected Condition ✨",
  "Fast Communication 💬",
];

export function HandoverScheduler({
  claimId,
  itemTitle,
  isOwner,
  userId,
  counterpartId,
  meetup,
  handover,
  onUpdate,
}: HandoverSchedulerProps) {
  const [openModal, setOpenModal] = useState(false);
  const [openFeedbackModal, setOpenFeedbackModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Form state
  const [selectedLocation, setSelectedLocation] = useState(
    SAFE_LOCATION_PRESETS[0]!,
  );
  const [customLocation, setCustomLocation] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");

  // Feedback state
  const [rating, setRating] = useState<"positive" | "neutral" | "negative">(
    "positive",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([FEEDBACK_TAGS[0]!]);
  const [feedbackComment, setFeedbackComment] = useState("");

  const activeLocation =
    selectedLocation === "custom" ? customLocation : selectedLocation;

  const isProposer = meetup?.proposed_by === userId;
  const isAccepted = meetup?.status === "accepted";
  const isDeclined = meetup?.status === "declined";

  // Handover completion status
  const posterDone = Boolean(handover?.poster_confirmed);
  const claimantDone = Boolean(handover?.claimant_confirmed);
  const isFullyCompleted = posterDone && claimantDone;
  const myConfirmed = isOwner ? posterDone : claimantDone;

  const handleProposeMeetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLocation.trim()) {
      toast.error("Please specify a meetup location.");
      return;
    }
    if (!scheduledTime) {
      toast.error("Please select a date and time for the meetup.");
      return;
    }

    setBusy(true);
    try {
      await api.proposeMeetup(claimId, {
        location: activeLocation.trim(),
        scheduled_time: scheduledTime,
        notes: notes.trim() || null,
      });

      toast.success("Safe meetup proposal sent to counterpart!");
      setOpenModal(false);
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to propose meetup.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRespondMeetup = async (status: "accepted" | "declined") => {
    setBusy(true);
    try {
      await api.respondMeetup(claimId, status);
      toast.success(
        status === "accepted"
          ? "Meetup schedule accepted!"
          : "Meetup proposal declined.",
      );
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to respond to meetup.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmHandover = async () => {
    setBusy(true);
    try {
      const res = await api.confirmHandover(claimId);
      if (res.isFullyCompleted) {
        toast.success(
          "🎉 Handover Completed! Item marked as successfully returned & resolved.",
        );
      } else {
        toast.success(
          "Confirmation recorded! Waiting for counterpart confirmation.",
        );
      }
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm handover.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartId) {
      toast.error("Counterpart information unavailable.");
      return;
    }

    setBusy(true);
    try {
      await api.postFeedback({
        claim_id: claimId,
        target_user_id: counterpartId,
        rating,
        tags: selectedTags,
        comment: feedbackComment.trim() || null,
      });

      toast.success("Feedback submitted! Thank you for strengthening campus trust.");
      setFeedbackSubmitted(true);
      setOpenFeedbackModal(false);
      onUpdate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit feedback.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-4 shadow-soft sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Handshake className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Safe Handover &amp; Meetup
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Campus safe-zone meetup scheduler &amp; verified handoff confirmation
            </p>
          </div>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-medium">
              <Calendar className="size-3.5" />
              {meetup ? "Reschedule Meetup" : "Schedule Meetup"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Shield className="size-4" />
                </div>
                <DialogTitle>Schedule Safe Handover</DialogTitle>
              </div>
              <DialogDescription>
                Propose a secure campus location and time for handing over{" "}
                <strong>"{itemTitle}"</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProposeMeetup} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Campus Safe Zone
                </Label>
                <div className="space-y-1.5">
                  {SAFE_LOCATION_PRESETS.map((loc, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedLocation(loc)}
                      className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                        selectedLocation === loc
                          ? "border-primary bg-primary/10 font-medium text-foreground"
                          : "border-border/70 hover:bg-surface text-muted-foreground"
                      }`}
                    >
                      <Shield className="size-3.5 shrink-0 text-primary" />
                      <span>{loc}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedLocation("custom")}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                      selectedLocation === "custom"
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border/70 hover:bg-surface text-muted-foreground"
                    }`}
                  >
                    <MapPin className="size-3.5 shrink-0 text-primary" />
                    <span>Custom Public Location</span>
                  </button>
                </div>
              </div>

              {selectedLocation === "custom" && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-loc" className="text-xs font-semibold">
                    Custom Location
                  </Label>
                  <Input
                    id="custom-loc"
                    required
                    placeholder="e.g. Dining Hall Entrance, Engineering Quad"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="meetup-time" className="text-xs font-semibold">
                  Date &amp; Time
                </Label>
                <Input
                  id="meetup-time"
                  type="datetime-local"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meetup-notes" className="text-xs font-semibold">
                  Meetup Note (Optional)
                </Label>
                <Textarea
                  id="meetup-notes"
                  rows={2}
                  placeholder="e.g. I'll be wearing a green jacket near the front doors."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModal(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy} className="gap-2">
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Calendar className="size-4" /> Propose Meetup
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meetup Proposal Status Card */}
      {meetup ? (
        <div className="mt-3.5 rounded-xl border bg-background/90 p-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <MapPin className="size-3.5 text-primary" />
              <span>{meetup.location}</span>
            </div>
            <Badge
              className={`text-[10px] font-bold ${
                isAccepted
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : isDeclined
                    ? "border-destructive/30 bg-destructive/15 text-destructive"
                    : "border-primary/30 bg-primary/15 text-primary"
              }`}
            >
              {isAccepted
                ? "Meetup Confirmed"
                : isDeclined
                  ? "Declined"
                  : "Meetup Proposed"}
            </Badge>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground/70" />
              {formatDateTime(meetup.scheduled_time)}
            </span>
            {meetup.notes && (
              <span className="italic text-foreground/80">"{meetup.notes}"</span>
            )}
          </div>

          {/* Accept / Decline actions for counterpart */}
          {!isProposer && meetup.status === "proposed" && (
            <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-2.5">
              <Button
                size="sm"
                className="h-7 gap-1 bg-emerald-600 px-3 text-xs hover:bg-emerald-700 text-white"
                disabled={busy}
                onClick={() => void handleRespondMeetup("accepted")}
              >
                <CheckCircle2 className="size-3.5" /> Accept Schedule
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-3 text-xs text-destructive hover:bg-destructive/10"
                disabled={busy}
                onClick={() => void handleRespondMeetup("declined")}
              >
                <XCircle className="size-3.5" /> Decline
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border/70 p-3.5 text-center text-xs text-muted-foreground">
          <p>No meetup scheduled yet. Pick a campus safe-zone to coordinate a safe handoff.</p>
        </div>
      )}

      {/* Dual Handover Confirmation Tracker */}
      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Handover Completion Verification
            </p>
            <p className="text-[11px] text-muted-foreground">
              Both parties confirm when the item has changed hands.
            </p>
          </div>

          <Badge
            variant="outline"
            className={`text-[10px] font-bold ${
              isFullyCompleted
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : posterDone || claimantDone
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
            }`}
          >
            {isFullyCompleted
              ? "Completed (2/2)"
              : posterDone || claimantDone
                ? "In Progress (1/2)"
                : "Awaiting Handover (0/2)"}
          </Badge>
        </div>

        {isFullyCompleted ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <PartyPopper className="size-5 shrink-0 text-emerald-500 animate-bounce" />
              <div>
                <p className="font-semibold">Item Handover Fully Completed! 🎉</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Both parties confirmed the return. The listing has been marked as <strong>Resolved</strong>.
                </p>
              </div>
            </div>

            {/* Post-Handover Feedback Dialog Trigger */}
            {counterpartId && !feedbackSubmitted && (
              <Dialog open={openFeedbackModal} onOpenChange={setOpenFeedbackModal}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <MessageSquareHeart className="size-4" />
                    Leave Handover Feedback &amp; Trust Rating
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Star className="size-4" />
                      </div>
                      <DialogTitle>Handover Feedback</DialogTitle>
                    </div>
                    <DialogDescription>
                      Share your experience to help build trust and reward helpful campus members.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmitFeedback} className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        How was the handover experience?
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRating("positive")}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition ${
                            rating === "positive"
                              ? "border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-400"
                              : "border-border hover:bg-surface text-muted-foreground"
                          }`}
                        >
                          <ThumbsUp className="size-4" />
                          <span>Smooth &amp; Safe</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRating("neutral")}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition ${
                            rating === "neutral"
                              ? "border-amber-500 bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400"
                              : "border-border hover:bg-surface text-muted-foreground"
                          }`}
                        >
                          <Star className="size-4" />
                          <span>Neutral</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRating("negative")}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition ${
                            rating === "negative"
                              ? "border-destructive bg-destructive/15 font-semibold text-destructive"
                              : "border-border hover:bg-surface text-muted-foreground"
                          }`}
                        >
                          <ThumbsDown className="size-4" />
                          <span>Issues Occurred</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Handover Highlights (Select tags)
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {FEEDBACK_TAGS.map((tag) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fb-comment" className="text-xs font-semibold">
                        Thank You / Additional Comments (Optional)
                      </Label>
                      <Textarea
                        id="fb-comment"
                        rows={2}
                        placeholder="e.g. Thanks so much for keeping my wallet safe!"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                      />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenFeedbackModal(false)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={busy} className="gap-1.5">
                        {busy ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <Star className="size-3.5" /> Submit Feedback
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    posterDone ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span>Item Poster (Finder): {posterDone ? "Confirmed ✓" : "Pending"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    claimantDone ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span>Claimant (Owner): {claimantDone ? "Confirmed ✓" : "Pending"}</span>
              </div>
            </div>

            <Button
              size="sm"
              disabled={myConfirmed || busy}
              onClick={() => void handleConfirmHandover()}
              className={`gap-1.5 text-xs font-semibold ${
                myConfirmed
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Confirming...
                </>
              ) : myConfirmed ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> You Confirmed
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  {isOwner ? "Confirm Item Handed Over" : "Confirm Item Received"}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
