import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  MapPin,
  Calendar,
  ArrowRight,
  Tag,
  Inbox,
  ShieldCheck,
  Rocket,
  Bookmark,
  Trash2,
  BellRing,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api, UserSmartMatches, ProofDetails, Watchlist } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { NotificationPreferencesDialog } from "@/components/NotificationPreferencesDialog";
import { ItemCard } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, type ClaimStatus, type ItemRow } from "@/lib/lostfound";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard | FoundIt" },
      {
        name: "description",
        content: "Track the items you posted, the claims you made and the requests waiting on you.",
      },
      { property: "og:title", content: "Your dashboard | FoundIt" },
      {
        property: "og:description",
        content: "Manage your listings, claims and conversations in one place.",
      },
    ],
  }),
  component: Dashboard,
});

interface ClaimWithItem {
  id: string;
  status: ClaimStatus;
  message: string;
  proof_details?: ProofDetails | null;
  decision_reason?: string | null;
  created_at: string;
  item_id: string;
  claimant_id: string;
  items: { title: string; item_type: string; posted_by?: string | null } | null;
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const bumpMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return api.bumpItem(itemId);
    },
    onSuccess: (res) => {
      toast.success(res.message || "Listing bumped to top!");
      void qc.invalidateQueries({ queryKey: ["my-items"] });
      void qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // 1. My Listings (Lost and Found items posted by current user)
  const { data: myItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["my-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { items } = await api.getItems();
        return items.filter(
          (i) =>
            i.posted_by === user?.id ||
            (user?.email && i.posted_by === user.email) ||
            (user?.user_metadata?.display_name &&
              i.poster_name === user.user_metadata.display_name),
        ) as ItemRow[];
      } catch (err) {
        console.warn("Express API getItems failed, falling back to Supabase...", err);
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("posted_by", user!.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ItemRow[];
      }
    },
  });

  // 2. All claims and items for computing user's claims and received claims
  const { data: allClaimsData, isLoading: claimsLoading } = useQuery({
    queryKey: ["dashboard-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const { claims } = await api.getClaims();
        const { items } = await api.getItems();
        const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
        const enriched = claims.map((c) => {
          const matchedItem = itemMap[c.item_id];
          return {
            ...c,
            items: matchedItem
              ? {
                  title: matchedItem.title,
                  item_type: matchedItem.item_type,
                  posted_by: matchedItem.posted_by,
                }
              : null,
          };
        }) as ClaimWithItem[];
        return { claims: enriched, items };
      } catch (err) {
        console.warn("Express API getClaims failed, falling back to Supabase...", err);
        const { data: claimsData, error: claimsErr } = await supabase
          .from("claims")
          .select(
            "id, status, message, created_at, item_id, claimant_id, items(title, item_type, posted_by)",
          )
          .order("created_at", { ascending: false });
        if (claimsErr) throw claimsErr;
        return {
          claims: (claimsData ?? []) as unknown as ClaimWithItem[],
          items: [] as ItemRow[],
        };
      }
    },
  });

  const myClaims = (allClaimsData?.claims ?? []).filter(
    (c) => c.claimant_id === user?.id || (user?.email && c.claimant_id === user.email),
  );

  const receivedClaims = (allClaimsData?.claims ?? []).filter((c) => {
    const isMyItem =
      c.items?.posted_by === user?.id || (user?.email && c.items?.posted_by === user.email);
    const isNotMyClaim = c.claimant_id !== user?.id && c.claimant_id !== user?.email;
    return isMyItem && isNotMyClaim;
  });

  // 3. Smart Matches
  const { data: smartMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["my-smart-matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const res = await api.getMySmartMatches();
        return res.results;
      } catch {
        return [] as UserSmartMatches[];
      }
    },
  });

  const totalMatchesCount = (smartMatches ?? []).reduce(
    (sum, group) => sum + group.matches.length,
    0,
  );

  // 4. Saved Watchlists
  const { data: watchlists, isLoading: watchlistsLoading } = useQuery({
    queryKey: ["watchlists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const res = await api.getWatchlists();
        return res.watchlists;
      } catch {
        return [] as Watchlist[];
      }
    },
  });

  const deleteWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.deleteWatchlist(id);
    },
    onSuccess: () => {
      toast.success("Watchlist removed.");
      void qc.invalidateQueries({ queryKey: ["watchlists"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="fluid-container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationPreferencesDialog />
            <Button asChild>
              <Link to="/post">Report an item</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="items" className="mt-6 md:mt-8">
          <TabsList className="flex w-full overflow-x-auto justify-start gap-1 p-1 bg-muted/70 rounded-xl no-scrollbar">
            <TabsTrigger value="items">My listings ({myItems?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="matches" className="relative gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Smart Matches
              {totalMatchesCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {totalMatchesCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="claims">My claims ({myClaims.length})</TabsTrigger>
            <TabsTrigger value="received" className="relative gap-1.5">
              <Inbox className="size-3.5" />
              Received Claims
              {receivedClaims.length > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {receivedClaims.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="watchlists" className="relative gap-1.5">
              <Bookmark className="size-3.5" />
              Watchlists ({watchlists?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: My Listings (Lost and Found posts) */}
          <TabsContent value="items" className="pt-6">
            {itemsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : myItems?.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col rounded-xl border bg-card shadow-soft overflow-hidden"
                  >
                    <ItemCard item={item} />
                    <div className="flex items-center justify-between border-t bg-muted/40 px-3 py-2 text-xs">
                      <span className="text-muted-foreground font-medium">
                        {item.status === "expired" ? "Status: Expired" : "Manage Post"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          bumpMutation.mutate(item.id);
                        }}
                        disabled={bumpMutation.isPending}
                        className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1"
                      >
                        <Rocket className="size-3" /> Bump to Top
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No listings yet"
                body="Post a lost or found item and it will show up here and on the campus browse board."
              />
            )}
          </TabsContent>

          {/* TAB 2: Smart Matches */}
          <TabsContent value="matches" className="pt-6">
            {matchesLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-44 rounded-2xl" />
              </div>
            ) : smartMatches?.length ? (
              <div className="space-y-8">
                {smartMatches.map((group) => (
                  <div
                    key={group.sourceItem.id}
                    className="overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={group.sourceItem.item_type === "lost" ? "lost" : "found"}
                            className="uppercase text-[10px]"
                          >
                            Your {group.sourceItem.item_type} post
                          </Badge>
                          <h3 className="font-display text-base font-semibold">
                            {group.sourceItem.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {group.sourceItem.category} • {group.sourceItem.location} •{" "}
                          {group.sourceItem.date_occurred}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/items/$id" params={{ id: group.sourceItem.id }}>
                          View your post
                        </Link>
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Detected Counterpart Matches ({group.matches.length}):
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.matches.map((match) => {
                          const mItem = match.item;
                          const isHigh = match.score >= 70;

                          return (
                            <div
                              key={mItem.id}
                              className="group relative flex flex-col justify-between rounded-xl border bg-surface/50 p-4 transition-all hover:border-primary/40 hover:bg-surface hover:shadow-sm"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="size-12 shrink-0 overflow-hidden rounded-lg border bg-card">
                                      <ItemImage
                                        path={mItem.image_url}
                                        category={mItem.category}
                                        alt={mItem.title}
                                        className="size-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <Link
                                        to="/items/$id"
                                        params={{ id: mItem.id }}
                                        className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
                                      >
                                        {mItem.title}
                                      </Link>
                                      <p className="text-xs text-muted-foreground">
                                        {mItem.category}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    className={`shrink-0 text-[10px] font-bold ${
                                      isHigh
                                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                        : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {match.score}% Match
                                  </Badge>
                                </div>

                                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3 text-muted-foreground/70" />
                                    {mItem.location}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="size-3 text-muted-foreground/70" />
                                    {mItem.date_occurred}
                                  </span>
                                </div>

                                {match.reasons && match.reasons.length > 0 && (
                                  <div className="mt-2.5 flex flex-wrap gap-1">
                                    {match.reasons.slice(0, 2).map((r, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-foreground/80"
                                      >
                                        <Tag className="size-2 text-primary/70" />
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-2">
                                <span className="text-[11px] text-muted-foreground">
                                  by {mItem.poster_name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                                  asChild
                                >
                                  <Link to="/items/$id" params={{ id: mItem.id }}>
                                    View &amp; Claim <ArrowRight className="size-3" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Smart Matches yet"
                body="When other campus members post items matching your active listings, they'll appear here automatically."
              />
            )}
          </TabsContent>

          {/* TAB 3: My Claims (Claims made BY current user) */}
          <TabsContent value="claims" className="pt-6">
            {claimsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : myClaims.length ? (
              <ul className="space-y-3">
                {myClaims.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-soft"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {c.items?.item_type && (
                          <Badge
                            variant={c.items.item_type === "lost" ? "lost" : "found"}
                            className="text-[10px] uppercase"
                          >
                            {c.items.item_type}
                          </Badge>
                        )}
                        <p className="font-semibold text-foreground">
                          {c.items?.title ?? "Claimed Item"}
                        </p>
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
                        {c.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted on {formatDateTime(c.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/claims/$claimId" params={{ claimId: c.id }}>
                          Open Thread
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No claims yet"
                body="When you claim an item you misplaced, you can track its proof verification and handover progress here."
              />
            )}
          </TabsContent>

          {/* TAB 4: Received Claims (Claims on current user's listings) */}
          <TabsContent value="received" className="pt-6">
            {claimsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
            ) : receivedClaims.length ? (
              <ul className="space-y-3">
                {receivedClaims.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card p-5 shadow-soft"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <p className="font-semibold text-foreground">
                          Claim on: {c.items?.title ?? "Your Listing"}
                        </p>
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
                        Proof: {c.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Received on {formatDateTime(c.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button size="sm" asChild>
                        <Link to="/claims/$claimId" params={{ claimId: c.id }}>
                          Review Proof &amp; Chat
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No received claims yet"
                body="When other users claim items you found, their proof submissions will appear here for your review."
              />
            )}
          </TabsContent>

          {/* TAB 5: Saved Watchlists */}
          <TabsContent value="watchlists" className="pt-6">
            {watchlistsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : watchlists?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {watchlists.map((w) => {
                  const filterPills = [
                    w.keyword ? `Keyword: "${w.keyword}"` : null,
                    w.category ? `Category: ${w.category}` : null,
                    w.campus_zone ? `Zone: ${w.campus_zone}` : null,
                    w.item_type ? `Type: ${w.item_type}` : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={w.id}
                      className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft transition-all hover:border-primary/30"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Bookmark className="size-4 text-primary" />
                            <h3 className="font-semibold text-foreground text-base">{w.name}</h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWatchlistMutation.mutate(w.id)}
                            className="text-muted-foreground hover:text-destructive h-8 px-2"
                            title="Delete watchlist"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {filterPills.length > 0 ? (
                            filterPills.map((pill, idx) => (
                              <Badge key={idx} variant="outline" className="text-[11px]">
                                {pill}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              All Campus Listings
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {w.notify_in_app && "🔔 In-App"}
                          {w.notify_email && " • 📧 Email"}
                          {w.notify_whatsapp && " • 💬 WhatsApp"}
                        </span>
                        <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                          <Link
                            to="/browse"
                            search={{
                              q: w.keyword || undefined,
                              category: w.category || undefined,
                              campus_zone: w.campus_zone || undefined,
                              type: w.item_type || undefined,
                            }}
                          >
                            Run Search →
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No saved search watchlists"
                body="Save your custom filters while browsing the board to get passive push alerts when items match your criteria."
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
