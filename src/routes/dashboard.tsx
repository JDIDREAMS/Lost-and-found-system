import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, MapPin, Calendar, ArrowRight, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, UserSmartMatches } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
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
        content:
          "Track the items you posted, the claims you made and the requests waiting on you.",
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
  created_at: string;
  item_id: string;
  items: { title: string; item_type: string } | null;
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: myItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["my-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { items } = await api.getItems();
      return items.filter((i) => i.posted_by === user!.id) as ItemRow[];
    },
  });

  const { data: myClaims } = useQuery({
    queryKey: ["my-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { claims } = await api.getClaims();
      const { items } = await api.getItems();
      const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
      return claims
        .filter((c) => c.claimant_id === user!.id)
        .map((c) => {
          const matchedItem = itemMap[c.item_id];
          return {
            ...c,
            items: matchedItem
              ? { title: matchedItem.title, item_type: matchedItem.item_type }
              : null,
          };
        }) as ClaimWithItem[];
    },
  });

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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button asChild>
            <Link to="/post">Report an item</Link>
          </Button>
        </div>

        <Tabs defaultValue="items" className="mt-8">
          <TabsList className="flex flex-wrap">
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
            <TabsTrigger value="claims">My claims ({myClaims?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="pt-6">
            {itemsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : myItems?.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {myItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No listings yet"
                body="Post a lost or found item and it will show up here."
              />
            )}
          </TabsContent>

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
                            variant={
                              group.sourceItem.item_type === "lost" ? "lost" : "found"
                            }
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

          <TabsContent value="claims" className="pt-6">
            {myClaims?.length ? (
              <ul className="space-y-3">
                {myClaims.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-soft"
                  >
                    <div>
                      <p className="font-medium">{c.items?.title ?? "Item"}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(c.created_at)}
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
                          Open
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No claims yet"
                body="When you claim an item, you can track its progress here."
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
