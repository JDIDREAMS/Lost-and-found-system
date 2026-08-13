import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send, ShieldCheck, Tag, Info } from "lucide-react";
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
  items: { title: string; posted_by: string | null } | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

function ClaimThread() {
  const { claimId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
            created_at: apiClaim.created_at,
            claimant_id: apiClaim.claimant_id,
            item_id: apiClaim.item_id,
            items: apiItem ? { title: apiItem.title, posted_by: apiItem.posted_by } : null,
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

            {/* Structured Proof & Decision Banner */}
            <div className="border-b bg-surface/40 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <ShieldCheck className="size-4 text-primary" /> Submitted Proof of Ownership
                </div>
                <TrustBadge userId={isOwner ? claim.claimant_id : claim.items?.posted_by} compact />
              </div>

              {proof &&
                (proof.brand ||
                  proof.unique_marks ||
                  proof.contents_description ||
                  proof.serial_fragment) && (
                  <div className="grid gap-2 rounded-xl bg-card border p-3.5 text-xs sm:grid-cols-2">
                    {proof.brand && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Brand / Make: </span>
                        <span className="text-foreground">{proof.brand}</span>
                      </div>
                    )}
                    {proof.serial_fragment && (
                      <div>
                        <span className="font-semibold text-muted-foreground">
                          Serial / Ending:{" "}
                        </span>
                        <span className="text-foreground">{proof.serial_fragment}</span>
                      </div>
                    )}
                    {proof.unique_marks && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-muted-foreground">Unique Marks: </span>
                        <span className="text-foreground">{proof.unique_marks}</span>
                      </div>
                    )}
                    {proof.contents_description && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-muted-foreground">
                          Contents / Inside:{" "}
                        </span>
                        <span className="text-foreground">{proof.contents_description}</span>
                      </div>
                    )}
                  </div>
                )}

              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Statement: </span>
                <span>{claim.message}</span>
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

            <form onSubmit={send} className="flex items-center gap-2 border-t p-4">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
              />
              <Button type="submit" size="icon" disabled={!draft.trim()}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
