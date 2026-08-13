import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  MapPin,
  Mail,
  Loader2,
  Trash2,
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ItemImage, parseImagePaths } from "@/components/ItemImage";
import { SmartMatchesWidget } from "@/components/SmartMatchesWidget";
import { ClaimSubmissionDialog } from "@/components/ClaimSubmissionDialog";
import { ClaimDecisionDialog } from "@/components/ClaimDecisionDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { TrustBadge } from "@/components/TrustBadge";

function ItemGallery({
  imagePayload,
  category,
  title,
}: {
  imagePayload: string | null;
  category?: string;
  title: string;
}) {
  const images = parseImagePaths(imagePayload);
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (images.length <= 1) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <ItemImage
          path={images[0] ?? null}
          category={category}
          alt={title}
          eager
          className="aspect-[4/3] w-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <ItemImage
          path={images[selectedIdx] ?? images[0] ?? null}
          category={category}
          alt={`${title} image ${selectedIdx + 1}`}
          eager
          className="aspect-[4/3] w-full"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((path, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className={`relative aspect-square w-16 overflow-hidden rounded-xl border transition ${
              selectedIdx === idx
                ? "ring-2 ring-primary border-primary"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            <ItemImage
              path={path}
              category={category}
              alt={`${title} thumbnail ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
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
import {
  formatDate,
  statusLabel,
  type ClaimStatus,
  type ItemRow,
  type ItemStatus,
} from "@/lib/lostfound";

import type { ProofDetails } from "@/lib/api";

export const Route = createFileRoute("/items/$id")({
  head: () => ({
    meta: [
      { title: "Item details | FoundIt" },
      {
        name: "description",
        content:
          "See the full report for this lost or found item and submit a claim with proof of ownership.",
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
  proof_details?: ProofDetails | null;
  decision_reason?: string | null;
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
      try {
        const { item } = await api.getItemById(id);
        if (item) return item as unknown as ItemRow;
      } catch (err) {
        console.warn("Express API getItemById failed, falling back to Supabase...", err);
      }
      const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as ItemRow | null;
    },
  });

  const { data: claims } = useQuery({
    queryKey: ["claims", id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { claims } = await api.getClaims(id);
        return claims as unknown as ClaimRow[];
      } catch {
        const { data, error } = await supabase
          .from("claims")
          .select("id, claimant_id, message, status, created_at")
          .eq("item_id", id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ClaimRow[];
      }
    },
  });

  const isOwner = !!user && !!item?.posted_by && user.id === item.posted_by;
  const myClaim = claims?.find((c) => c.claimant_id === user?.id);

  const submitClaim = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to submit a claim.");
      try {
        await api.submitClaim(id, claimText.trim());
      } catch {
        const { error } = await supabase
          .from("claims")
          .insert({ item_id: id, claimant_id: user.id, message: claimText.trim() });
        if (error) throw error;
      }
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
      try {
        await api.updateClaimStatus(claimId, status);
      } catch {
        const { error } = await supabase.from("claims").update({ status }).eq("id", claimId);
        if (error) throw error;
        if (status === "approved") {
          await supabase.from("items").update({ status: "claimed" }).eq("id", id);
        }
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
      try {
        await api.updateItem(id, { status });
      } catch {
        const { error } = await supabase.from("items").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Status updated.");
      void qc.invalidateQueries({ queryKey: ["item", id] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async () => {
      try {
        await api.deleteItem(id);
      } catch {
        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) throw error;
      }
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
            <ItemGallery
              imagePayload={item.image_url}
              category={item.category}
              title={item.title}
            />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.item_type === "lost" ? "lost" : "found"} className="uppercase">
                    {item.item_type}
                  </Badge>
                  <Badge variant="muted">{item.category}</Badge>
                  <Badge variant="outline">{statusLabel[item.status]}</Badge>
                </div>
                {!isOwner && (
                  <ReportDialog
                    targetType="item"
                    targetId={item.id}
                    targetTitle={item.title}
                  />
                )}
              </div>
              <h1 className="mt-4 text-3xl font-semibold">{item.title}</h1>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{item.description}</p>

              <dl className="mt-6 space-y-2.5 text-sm">
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    <span>Posted by {item.poster_name}</span>
                  </div>
                  <TrustBadge userId={item.posted_by} compact />
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
                  <ul className="mt-3 space-y-4">
                    {(claims ?? []).map((c) => {
                      const proof = c.proof_details;
                      return (
                        <li key={c.id} className="rounded-xl border bg-surface/50 p-4 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Claim Proof Submission
                            </span>
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
                          </div>

                          {/* Structured Proof Details */}
                          {proof &&
                            (proof.brand ||
                              proof.unique_marks ||
                              proof.contents_description ||
                              proof.serial_fragment) && (
                              <div className="mt-3 grid gap-2 rounded-lg bg-muted/60 p-3 text-xs sm:grid-cols-2">
                                {proof.brand && (
                                  <div>
                                    <span className="font-semibold text-muted-foreground">
                                      Brand / Make:{" "}
                                    </span>
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
                                    <span className="font-semibold text-muted-foreground">
                                      Unique Marks:{" "}
                                    </span>
                                    <span className="text-foreground">{proof.unique_marks}</span>
                                  </div>
                                )}
                                {proof.contents_description && (
                                  <div className="sm:col-span-2">
                                    <span className="font-semibold text-muted-foreground">
                                      Contents / Inside:{" "}
                                    </span>
                                    <span className="text-foreground">
                                      {proof.contents_description}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                          <div className="mt-3">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Statement:
                            </p>
                            <p className="mt-1 text-sm text-foreground">{c.message}</p>
                          </div>

                          {c.decision_reason && (
                            <div className="mt-3 rounded-lg border border-border/80 bg-background p-2.5 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">Decision Note: </span>
                              {c.decision_reason}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                            <div className="flex items-center gap-2">
                              {c.status === "pending" && (
                                <>
                                  <ClaimDecisionDialog
                                    claimId={c.id}
                                    itemTitle={item.title}
                                    mode="approved"
                                    onSuccess={() => {
                                      void qc.invalidateQueries({ queryKey: ["claims", id] });
                                      void qc.invalidateQueries({ queryKey: ["item", id] });
                                    }}
                                  />
                                  <ClaimDecisionDialog
                                    claimId={c.id}
                                    itemTitle={item.title}
                                    mode="rejected"
                                    onSuccess={() => {
                                      void qc.invalidateQueries({ queryKey: ["claims", id] });
                                    }}
                                  />
                                </>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs" asChild>
                              <Link to="/claims/$claimId" params={{ claimId: c.id }}>
                                Open thread →
                              </Link>
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                    {claims?.length === 0 && (
                      <li className="text-sm text-muted-foreground">No claims yet.</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    <h2 className="text-lg font-semibold">Is this yours?</h2>
                  </div>
                  {!user ? (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to submit a claim with structured proof of ownership.
                      </p>
                      <Button className="mt-4" asChild>
                        <Link to="/auth">Sign in to claim</Link>
                      </Button>
                    </>
                  ) : myClaim ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        You submitted a proof-of-ownership claim — status:{" "}
                        <Badge
                          variant={
                            myClaim.status === "approved"
                              ? "found"
                              : myClaim.status === "rejected"
                                ? "destructive"
                                : "muted"
                          }
                          className="ml-1"
                        >
                          {myClaim.status}
                        </Badge>
                      </p>

                      {myClaim.decision_reason && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                          <span className="font-semibold text-foreground">Note from poster: </span>
                          <span className="text-muted-foreground">{myClaim.decision_reason}</span>
                        </div>
                      )}

                      {item.item_type === "found" && item.contact_info ? (
                        <Button
                          className="gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                          asChild
                        >
                          <a
                            href={`https://wa.me/${item.contact_info.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="size-4" />
                            Chat on WhatsApp
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" asChild>
                          <Link to="/claims/$claimId" params={{ claimId: myClaim.id }}>
                            Open message thread
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Submit structured identifying details (brand, unique marks, contents, or
                        serial fragment) so the poster can safely verify you as the owner.
                      </p>
                      <ClaimSubmissionDialog
                        itemId={item.id}
                        itemTitle={item.title}
                        onSuccess={() => {
                          void qc.invalidateQueries({ queryKey: ["claims", id] });
                          void qc.invalidateQueries({ queryKey: ["dashboard-claims"] });
                          void qc.invalidateQueries({ queryKey: ["my-claims"] });
                          void qc.invalidateQueries({ queryKey: ["item", id] });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Smart Potential Matches Section */}
              <div className="mt-8 pt-4">
                <SmartMatchesWidget itemId={item.id} itemType={item.item_type} title={item.title} />
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
