import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ItemCard } from "@/components/ItemCard";
import { WatchlistDialog } from "@/components/WatchlistDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { CATEGORIES, CAMPUS_ZONES, type ItemRow } from "@/lib/lostfound";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse lost & found items | FoundIt" },
      {
        name: "description",
        content:
          "Search every reported lost and found item. Filter by category, campus zone, location, status and date range.",
      },
      { property: "og:title", content: "Browse lost & found items | FoundIt" },
      {
        property: "og:description",
        content: "Filter the campus board by category, campus zone, location, status and date.",
      },
    ],
  }),
  component: Browse,
});

const ANY = "any";

function Browse() {
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState(ANY);
  const [category, setCategory] = useState(ANY);
  const [campusZone, setCampusZone] = useState("all");
  const [status, setStatus] = useState(ANY);
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery<ItemRow[]>({
    queryKey: ["items", "supabase", campusZone],
    queryFn: async (): Promise<ItemRow[]> => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch items from Supabase:", error);
        throw error;
      }
      return (data ?? []) as ItemRow[];
    },
  });

  const results: ItemRow[] = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const seen = new Set<string>();

    return (data ?? []).filter((item: ItemRow) => {
      const contentKey = `${item.title.trim().toLowerCase()}__${item.item_type}__${item.location.trim().toLowerCase()}`;
      if (seen.has(contentKey) || seen.has(item.id)) return false;
      seen.add(contentKey);
      seen.add(item.id);

      if (type !== ANY && item.item_type !== type) return false;
      if (category !== ANY && item.category !== category) return false;
      if (campusZone !== "all" && item.campus_zone && item.campus_zone !== campusZone) return false;
      if (status !== ANY && item.status !== status) return false;
      if (loc && !item.location.toLowerCase().includes(loc)) return false;
      if (from && item.date_occurred < from) return false;
      if (to && item.date_occurred > to) return false;
      if (
        k &&
        !`${item.title} ${item.description} ${item.category} ${item.location} ${item.campus_zone || ""}`
          .toLowerCase()
          .includes(k)
      )
        return false;
      return true;
    });
  }, [data, keyword, type, category, campusZone, status, location, from, to]);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = [
    keyword.trim() !== "",
    type !== ANY,
    category !== ANY,
    campusZone !== "all",
    status !== ANY,
    location.trim() !== "",
    from !== "",
    to !== "",
  ].filter(Boolean).length;

  const reset = () => {
    setKeyword("");
    setType(ANY);
    setCategory(ANY);
    setCampusZone("all");
    setStatus(ANY);
    setLocation("");
    setFrom("");
    setTo("");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="fluid-container py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold">Browse the board</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLoading
                ? "Loading items…"
                : `${results.length} item${results.length === 1 ? "" : "s"} match your filters.`}
            </p>
          </div>

          {/* Mobile Filter Toggle Button */}
          <div className="flex items-center gap-2 w-full lg:hidden pt-2">
            <Button
              variant={mobileFiltersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex-1 justify-between h-11 border-border/80"
            >
              <span className="flex items-center gap-2 font-semibold text-sm">
                <SlidersHorizontal className="size-4 text-primary" /> Filters &amp; Search
              </span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs font-bold">
                    {activeFilterCount} active
                  </Badge>
                )}
                {mobileFiltersOpen ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </div>
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-11 px-3">
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 md:mt-8 grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside
            className={`h-fit rounded-2xl border bg-card p-5 shadow-soft lg:sticky lg:top-24 ${
              mobileFiltersOpen ? "block animate-in fade-in duration-200" : "hidden lg:block"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="size-4" /> Filters
              </span>
              <div className="flex items-center gap-2">
                <WatchlistDialog
                  currentFilters={{
                    keyword: keyword || undefined,
                    category: category !== ANY ? category : undefined,
                    campusZone: campusZone !== "all" ? campusZone : undefined,
                    type: type !== ANY ? type : undefined,
                  }}
                />
                <button
                  onClick={reset}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="keyword">Keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="keyword"
                    className="pl-9"
                    placeholder="wallet, laptop…"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Lost & found</SelectItem>
                    <SelectItem value="lost">Lost items</SelectItem>
                    <SelectItem value="found">Found items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Campus Geo-Zone</Label>
                <Select value={campusZone} onValueChange={setCampusZone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUS_ZONES.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.icon} {z.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>Any status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="claimed">Claim in progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Main Library, Lecture Hall B…"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {/* Campus Geo-Zone Quick Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CAMPUS_ZONES.map((z) => {
                const isActive = campusZone === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setCampusZone(z.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{z.icon}</span>
                    <span>{z.label}</span>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-52 rounded-xl" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-12 text-center">
                <h2 className="text-xl font-semibold">No matches</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try widening your filters or clearing the keyword.
                </p>
                <Button className="mt-5" variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))" }}>
                {results.map((item: ItemRow) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
