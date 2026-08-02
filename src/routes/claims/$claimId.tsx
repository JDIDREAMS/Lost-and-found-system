import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
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
  created_at: string;
  claimant_id: string;
  item_id: string;
  items: { title: string; posted_by: string | null } | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
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
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`claim-${claimId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `claim_id=eq.${claimId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["claim-messages", claimId] });
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
    const { error } = await supabase
      .from("messages")
      .insert({ claim_id: claimId, sender_id: user.id, body });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["claim-messages", claimId] });
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
              <div className="flex items-center gap-2">
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
                <Button size="sm" variant="outline" asChild>
                  <Link to="/items/$id" params={{ id: claim.item_id }}>
                    View item
                  </Link>
                </Button>
              </div>
            </div>

            <div className="max-h-[26rem] space-y-3 overflow-y-auto p-5">
              <div className="rounded-xl bg-muted p-4 text-sm">
                <p className="font-medium">Original claim</p>
                <p className="mt-1 text-muted-foreground">{claim.message}</p>
              </div>
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
                      <p className="whitespace-pre-line">{m.body}</p>
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
