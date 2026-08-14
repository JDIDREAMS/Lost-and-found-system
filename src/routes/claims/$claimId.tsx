import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  ShieldCheck,
  Tag,
  Info,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Phone,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api, ProofDetails, MeetupProposal, HandoverStatus } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ClaimDecisionDialog } from "@/components/ClaimDecisionDialog";
import { HandoverScheduler } from "@/components/HandoverScheduler";
import { ReportDialog } from "@/components/ReportDialog";
import { TrustBadge } from "@/components/TrustBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, type ClaimStatus } from "@/lib/lostfound";

export const Route = createFileRoute("/claims/$claimId")({
  head: () => ({
    meta: [
      { title: "Claim conversation | FoundIt" },
      {
        name: "description",
        content: "Message the other party about this claim and arrange a safe hand-over.",
      },
      { property: "og:title", content: "Claim conversation | FoundIt" },
      {
        property: "og:description",
        content: "Private thread between the item poster and the claimant.",
      },
    ],
  }),
  component: ClaimThread,
});

interface ClaimDetail {
  id: string;
  status: ClaimStatus;
  message: string;
  proof_details?: ProofDetails | null;
  decision_reason?: string | null;
  meetup?: MeetupProposal | null;
  handover?: HandoverStatus | null;
  created_at: string;
  claimant_id: string;
  item_id: string;
  items: {
    title: string;
    posted_by: string | null;
    contact_info?: string | null;
    status?: string;
  } | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

export function ClaimThread() {
  const { claimId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Poster interactive proof checklist state
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
    brand: true,
    unique_marks: true,
    contents: true,
    serial: true,
  });

  const toggleChecklist = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", claimId],
    enabled: !!user,
    queryFn: async () => {
      // 1. Try Express API first (works for JWT-auth users)
      try {
        const { claim: apiClaim, item: apiItem } = await api.getClaimById(claimId);
        if (apiClaim) {
          return {
            id: apiClaim.id,
            status: apiClaim.status as ClaimStatus,
            message: apiClaim.message,
            proof_details: apiClaim.proof_details,
            decision_reason: apiClaim.decision_reason,
            meetup: apiClaim.meetup,
            handover: apiClaim.handover,
            created_at: apiClaim.created_at,
            claimant_id: apiClaim.claimant_id,
            item_id: apiClaim.item_id,
            items: apiItem
              ? {
                  title: apiItem.title,
                  posted_by: apiItem.posted_by,
                  contact_info: apiItem.contact_info,
                  status: apiItem.status,
                }
              : null,
          } as ClaimDetail;
        }
      } catch (err) {
        console.warn("Express API getClaimById failed, falling back to Supabase...", err);
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from("claims")
        .select("id, status, message, created_at, claimant_id, item_id, items(title, posted_by)")
        .eq("id", claimId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ClaimDetail | null;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["claim-messages", claimId],
    enabled: !!user,
    queryFn: async () => {
      // 1. Try Express API first
      try {
        const { messages: apiMsgs } = await api.getMessages(claimId);
        return (apiMsgs ?? []) as MessageRow[];
      } catch (err) {
        console.warn("Express API getMessages failed, falling back to Supabase...", err);
      }

      // 2. Fallback to Supabase
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, text, created_at")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`claim-chat-${claimId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `claim_id=eq.${claimId}`,
        },
        (payload) => {
          qc.setQueryData<MessageRow[]>(["claim-messages", claimId], (prev = []) => {
            const row = payload.new as MessageRow;
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [claimId, qc, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !user) return;
    setDraft("");

    // 1. Try Express API first
    try {
      await api.sendMessage(claimId, body);
      void qc.invalidateQueries({ queryKey: ["claim-messages", claimId] });
      return;
    } catch (err) {
      console.warn("Express API sendMessage failed, falling back to Supabase...", err);
    }

    // 2. Fallback to Supabase
    const { error } = await supabase
      .from("messages")
      .insert({ claim_id: claimId, sender_id: user.id, text: body });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["claim-messages", claimId] });
  };

  const isOwner = user && claim?.items?.posted_by === user.id;
  const proof = claim?.proof_details;
  const isApproved = claim?.status === "approved";
  const isResolved = claim?.handover?.poster_confirmed && claim?.handover?.claimant_confirmed;

  // Structured prompt actions
  const applyPrompt = (text: string) => {
    setDraft(text);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </Button>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !claim ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <h1 className="text-2xl font-semibold">Conversation unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have access to this claim.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h1 className="font-display text-xl font-semibold">
                  {claim.items?.title ?? "Claim"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opened {formatDateTime(claim.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    claim.status === "approved"
                      ? "found"
                      : claim.status === "rejected"
                        ? "destructive"
                        : "muted"
                  }
                >
                  {claim.status}
                </Badge>

                {isOwner && claim.status === "pending" && (
                  <div className="flex items-center gap-1.5">
                    <ClaimDecisionDialog
                      claimId={claim.id}
                      itemTitle={claim.items?.title || "Item"}
                      mode="approved"
                      onSuccess={() => {
                        void qc.invalidateQueries({ queryKey: ["claim", claimId] });
                      }}
                    />
                    <ClaimDecisionDialog
                      claimId={claim.id}
                      itemTitle={claim.items?.title || "Item"}
                      mode="rejected"
                      onSuccess={() => {
                        void qc.invalidateQueries({ queryKey: ["claim", claimId] });
                      }}
                    />
                  </div>
                )}

                <Button size="sm" variant="outline" asChild>
                  <Link to="/items/$id" params={{ id: claim.item_id }}>
                    View item
                  </Link>
                </Button>

                <ReportDialog
                  targetType="claim"
                  targetId={claim.id}
                  targetTitle={claim.items?.title || "Claim"}
                />
              </div>
            </div>

            {/* Pinned Sticky Banner: Accepted Meetup or Fully Completed Handover */}
            {isResolved ? (
              <div className="flex items-center justify-between bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <PartyPopper className="size-4 text-emerald-600" />
                  <span>
                    🎉 Handover Completed &amp; Item Resolved! This claim thread is completed.
                  </span>
                </div>
                <Badge variant="found">Closed &amp; Returned</Badge>
              </div>
            ) : claim.meetup?.status === "accepted" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/10 border-b border-primary/20 px-5 py-3 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <MapPin className="size-4 text-primary" />
                  <span>
                    <strong>Accepted Meetup:</strong> {claim.meetup.location} on{" "}
                    <strong>{formatDateTime(claim.meetup.scheduled_time)}</strong>
                  </span>
                </div>
                <Badge variant="default" className="text-[10px]">
                  🤝 Confirmed Place Pinned
                </Badge>
              </div>
            ) : null}

            {/* Structured Proof & Item-Identification Checklist */}
            <div className="border-b bg-surface/40 p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <ShieldCheck className="size-4 text-primary" /> Item-Identification Proof
                  Checklist
                </div>
                <TrustBadge userId={isOwner ? claim.claimant_id : claim.items?.posted_by} compact />
              </div>

              {proof &&
                (proof.brand ||
                  proof.unique_marks ||
                  proof.contents_description ||
                  proof.serial_fragment) && (
                  <div className="space-y-2 rounded-xl bg-card border p-3.5 text-xs">
                    <p className="text-muted-foreground text-[11px] mb-2 font-medium">
                      {isOwner
                        ? "Verify claimant's submitted answers against the item in your possession:"
                        : "Your submitted identification details:"}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {proof.brand && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2 border">
                          <div>
                            <span className="font-semibold text-muted-foreground">Brand: </span>
                            <span className="text-foreground">{proof.brand}</span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => toggleChecklist("brand")}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition ${
                                checkedItems["brand"]
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {checkedItems["brand"] ? "✅ Matched" : "❌ No Match"}
                            </button>
                          )}
                        </div>
                      )}

                      {proof.serial_fragment && (
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2 border">
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Serial Hint:{" "}
                            </span>
                            <span className="text-foreground">{proof.serial_fragment}</span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => toggleChecklist("serial")}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition ${
                                checkedItems["serial"]
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {checkedItems["serial"] ? "✅ Matched" : "❌ No Match"}
                            </button>
                          )}
                        </div>
                      )}

                      {proof.unique_marks && (
                        <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted/40 p-2 border">
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Unique Marks:{" "}
                            </span>
                            <span className="text-foreground">{proof.unique_marks}</span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => toggleChecklist("unique_marks")}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition ${
                                checkedItems["unique_marks"]
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {checkedItems["unique_marks"] ? "✅ Matched" : "❌ No Match"}
                            </button>
                          )}
                        </div>
                      )}

                      {proof.contents_description && (
                        <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted/40 p-2 border">
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Contents Inside:{" "}
                            </span>
                            <span className="text-foreground">{proof.contents_description}</span>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => toggleChecklist("contents")}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition ${
                                checkedItems["contents"]
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {checkedItems["contents"] ? "✅ Matched" : "❌ No Match"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Claim Statement: </span>
                <span>{claim.message}</span>
              </div>

              {/* Privacy Guardrails: Contact Details revealed ONLY when approved */}
              <div className="rounded-xl border p-3 text-xs">
                {isApproved && claim.items?.contact_info ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-emerald-600" />
                      <div>
                        <span className="font-semibold">Direct Contact (Claim Approved): </span>
                        <span>+{claim.items.contact_info}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${claim.items.contact_info.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="size-3 mr-1" /> Open WhatsApp
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <Lock className="size-3.5 text-primary" />
                    <span>
                      <strong>Privacy Guardrail:</strong> Direct phone/contact information is masked
                      and unlocked only after the claim is approved.
                    </span>
                  </div>
                )}
              </div>

              {claim.decision_reason && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    claim.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive-foreground"
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <Info className="size-3.5" /> Decision Note from Poster:
                  </p>
                  <p className="mt-1">{claim.decision_reason}</p>
                </div>
              )}

              {/* Safe Handover Scheduler & Dual Confirmation Tracker */}
              <div className="pt-2">
                <HandoverScheduler
                  claimId={claim.id}
                  itemTitle={claim.items?.title || "Item"}
                  isOwner={Boolean(isOwner)}
                  userId={user!.id}
                  counterpartId={isOwner ? claim.claimant_id : claim.items?.posted_by}
                  meetup={claim.meetup}
                  handover={claim.handover}
                  onUpdate={() => {
                    void qc.invalidateQueries({ queryKey: ["claim", claimId] });
                    void qc.invalidateQueries({ queryKey: ["claim-messages", claimId] });
                  }}
                />
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="max-h-[22rem] space-y-3 overflow-y-auto p-5">
              {(messages ?? []).map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        mine
                          ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                          : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm"
                      }
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      <p className="mt-1 text-[10px] opacity-70">{formatDateTime(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Structured Chat Prompts & Message Input */}
            {isResolved ? (
              <div className="border-t bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                🔒 Handover completed. This conversation thread has been finalized.
              </div>
            ) : (
              <div className="border-t p-3 space-y-2">
                {/* Quick Action Prompt Chips */}
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                    Quick Prompts:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      applyPrompt(
                        "Let's meet at Main Library entrance (Ground Floor lobby near security desk).",
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
                  >
                    <MapPin className="size-3" /> Suggest meeting point
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPrompt("Does tomorrow at 2:00 PM work for you for the handover?")
                    }
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
                  >
                    <Clock className="size-3" /> Suggest time
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyPrompt("Here is an additional identifying detail about this item: ")
                    }
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/10 hover:text-primary transition"
                  >
                    <Sparkles className="size-3" /> Share identifying detail
                  </button>
                </div>

                <form onSubmit={send} className="flex items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message or click a prompt above…"
                  />
                  <Button type="submit" size="icon" disabled={!draft.trim()}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
