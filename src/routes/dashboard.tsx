import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ItemCard } from "@/components/ItemCard";
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
      // Fetch all items then filter by this user's ID (Express backend)
      const { items } = await api.getItems();
      return items.filter((i) => i.posted_by === user!.id) as ItemRow[];
    },
  });

  const { data: myClaims } = useQuery({
    queryKey: ["my-claims", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { claims } = await api.getClaims();
      // Attach item title by fetching items list once
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
          <TabsList>
            <TabsTrigger value="items">My listings ({myItems?.length ?? 0})</TabsTrigger>
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
