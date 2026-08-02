import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, MapPin, Mail, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ItemImage } from "@/components/ItemImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, statusLabel, type ClaimStatus, type ItemRow, type ItemStatus } from "@/lib/lostfound";

export const Route = createFileRoute("/items/$id")({
  head: () => ({
    meta: [
      { title: "Item details | FoundIt" },
      {
        name: "description",
        content: "See the full report for this lost or found item and submit a claim with proof of ownership.",
      },
      { property: "og:title", content: "Item details | FoundIt" },
      {
        property: "og:description",
        content: "Full report, location, date and claim options for this item.",
      },
    ],
  }),
  component: ItemDetail,
});

interface ClaimRow {
  id: string;
  claimant_id: string;
  message: string;
  status: ClaimStatus;
  created_at: string;
}

function ItemDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [claimText, setClaimText] = useState("");

  const { data: item, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ItemRow | null;
    },
  });

  const { data: claims } = useQuery({
    queryKey: ["item-claims", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, claimant_id, message, status, created_at")
        .eq("item_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClaimRow[];
    },
  });

  const isOwner = !!user && !!item?.posted_by && user.id === item.posted_by;
  const myClaim = claims?.find((c) => c.claimant_id === user?.id);

  const submitClaim = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to submit a claim.");
      const { error } = await supabase
        .from("claims")
        .insert({ item_id: id, claimant_id: user.id, message: claimText.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setClaimText("");
      toast.success("Claim submitted — the poster has been notified.");
      void qc.invalidateQueries({ queryKey: ["item-claims", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideClaim = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: string; status: ClaimStatus }) => {
      const { error } = await supabase.from("claims").update({ status }).eq("id", claimId);
      if (error) throw error;
      if (status === "approved") {
        await supabase.from("items").update({ status: "claimed" }).eq("id", id);
      }
    },
    onSuccess: () => {
      toast.success("Claim updated.");
      void qc.invalidateQueries({ queryKey: ["item-claims", id] });
      void qc.invalidateQueries({ queryKey: ["item", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: ItemStatus) => {
      const { error } = await supabase.from("items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated.");
      void qc.invalidateQueries({ queryKey: ["item", id] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removed.");
      void navigate({ to: "/browse" });
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/browse">
            <ArrowLeft className="size-4" /> Back to board
          </Link>
        </Button>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !item ? (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <h1 className="text-2xl font-semibold">Item not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may have been removed by its owner.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
              <ItemImage
                path={item.image_url}
                alt={item.title}
                eager
                className="aspect-[4/3] w-full"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.item_type === "lost" ? "lost" : "found"} className="uppercase">
                  {item.item_type}
                </Badge>
                <Badge variant="muted">{item.category}</Badge>
                <Badge variant="outline">{statusLabel[item.status]}</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold">{item.title}</h1>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{item.description}</p>

              <dl className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span>{item.location || "Location not specified"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  <span>
                    {item.item_type === "lost" ? "Lost on" : "Found on"}{" "}
                    {formatDate(item.date_occurred)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-primary" />
                  <span>Posted by {item.poster_name}</span>
                </div>
              </dl>

              {isOwner ? (
                <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
                  <h2 className="text-lg font-semibold">Manage this post</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Select
                      value={item.status}
                      onValueChange={(v) => setStatus.mutate(v as ItemStatus)}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="claimed">Claim in progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => removeItem.mutate()}
                      className="text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>

                  <h3 className="mt-6 text-sm font-semibold">
                    Claim requests ({claims?.length ?? 0})
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {(claims ?? []).map((c) => (
                      <li key={c.id} className="rounded-xl border p-4">
                        <p className="text-sm">{c.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              c.status === "approved"
                                ? "found"
                                : c.status === "rejected"
                                  ? "destructive"
                                  : "muted"
                            }
                          >
                            {c.status}
                          </Badge>
                          {c.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  decideClaim.mutate({ claimId: c.id, status: "approved" })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  decideClaim.mutate({ claimId: c.id, status: "rejected" })
                                }
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/claims/$claimId" params={{ claimId: c.id }}>
                              Open thread
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                    {claims?.length === 0 && (
                      <li className="text-sm text-muted-foreground">No claims yet.</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
                  <h2 className="text-lg font-semibold">Is this yours?</h2>
                  {!user ? (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to submit a claim with proof of ownership.
                      </p>
                      <Button className="mt-4" asChild>
                        <Link to="/auth">Sign in to claim</Link>
                      </Button>
                    </>
                  ) : myClaim ? (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        You submitted a claim — status:{" "}
                        <span className="font-medium text-foreground">{myClaim.status}</span>.
                      </p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link to="/claims/$claimId" params={{ claimId: myClaim.id }}>
                          Open message thread
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Describe something only the owner would know — a mark, contents, or where
                        exactly you lost it.
                      </p>
                      <Textarea
                        className="mt-3"
                        rows={4}
                        placeholder="The wallet has a torn corner and a library card with my name…"
                        value={claimText}
                        onChange={(e) => setClaimText(e.target.value)}
                      />
                      <Button
                        className="mt-3"
                        disabled={claimText.trim().length < 10 || submitClaim.isPending}
                        onClick={() => submitClaim.mutate()}
                      >
                        {submitClaim.isPending && <Loader2 className="size-4 animate-spin" />}
                        Submit claim
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
