import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, statusLabel, type ItemRow } from "@/lib/lostfound";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel | FoundIt" },
      {
        name: "description",
        content:
          "Moderate listings, review claim activity and keep the lost and found board clean.",
      },
      { property: "og:title", content: "Admin panel | FoundIt" },
      { property: "og:description", content: "Moderation tools for the FoundIt board." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth" });
    else if (!isAdmin) void navigate({ to: "/dashboard" });
  }, [loading, user, isAdmin, navigate]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-items"],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { items } = await api.getItems();
        return items as unknown as ItemRow[];
      } catch {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as ItemRow[];
      }
    },
  });

  const { data: claimCount } = useQuery({
    queryKey: ["admin-claim-count"],
    enabled: !!isAdmin,
    queryFn: async () => {
      try {
        const { claims } = await api.getClaims();
        return claims.length;
      } catch {
        const { count, error } = await supabase
          .from("claims")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.deleteItem(id);
      } catch {
        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Listing removed.");
      void qc.invalidateQueries({ queryKey: ["admin-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = [
    { label: "Total listings", value: items?.length ?? 0 },
    { label: "Open", value: items?.filter((i) => i.status === "open").length ?? 0 },
    { label: "Resolved", value: items?.filter((i) => i.status === "resolved").length ?? 0 },
    { label: "Claims", value: claimCount ?? 0 },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Moderate listings across the board.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-soft">
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        to="/items/$id"
                        params={{ id: item.id }}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.poster_name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.item_type === "lost" ? "lost" : "found"}>
                        {item.item_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{statusLabel[item.status]}</TableCell>
                    <TableCell className="text-sm">{formatDate(item.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove.mutate(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
