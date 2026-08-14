import { useMemo, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Rows,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
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
import { CATEGORIES, CAMPUS_ZONES, isItemInCampusZone, type ItemRow } from "@/lib/lostfound";

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
  const [viewMode, setViewMode] = useState<"grid" | "rail" | "list">("grid");

  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (direction: "left" | "right") => {
    if (railRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      railRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const { data, isLoading } = useQuery<ItemRow[]>({
    queryKey: ["items", "browse-all"],
    queryFn: async (): Promise<ItemRow[]> => {
      try {
        const { items } = await api.getItems();
        return (items ?? []) as unknown as ItemRow[];
      } catch (err) {
        console.warn("Express API getItems failed, falling back to Supabase...", err);
        const { data: sbData, error } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (sbData ?? []) as ItemRow[];
      }
    },
  });

  const results: ItemRow[] = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const seenIds = new Set<string>();

    return (data ?? []).filter((item: ItemRow) => {
      if (!item || !item.id) return false;
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);

      if (type !== ANY && item.item_type !== type) return false;
      if (category !== ANY && item.category !== category) return false;
      if (campusZone !== "all" && !isItemInCampusZone(item.campus_zone, campusZone, item.location))
        return false;
      if (status !== ANY && item.status !== status) return false;
      if (loc && !(item.location || "").toLowerCase().includes(loc)) return false;
      if (from && (item.date_occurred || "") < from) return false;
      if (to && (item.date_occurred || "").slice(0, 10) > to) return false;
      if (
        k &&
        !`${item.title || ""} ${item.description || ""} ${item.category || ""} ${item.location || ""} ${item.campus_zone || ""}`
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
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="fluid-container flex-1 py-6 sm:py-8 md:py-10">
        {/* Header Title and View Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="rule-label text-muted-foreground">Community Lost &amp; Found</span>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl md:text-4xl font-semibold">
              Browse the board
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLoading
                ? "Loading items…"
                : `${results.length} item${results.length === 1 ? "" : "s"} found on campus.`}
            </p>
          </div>

          {/* View Mode Controls & Mobile Filter Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border bg-card p-1 shadow-xs">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === "rail" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode("rail")}
                title="Horizontal Swipe Rail"
              >
                <Layers className="size-3.5 text-primary" />
                <span>Swipe Rail</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5"
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <Rows className="size-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="flex lg:hidden items-center gap-2 flex-1 sm:flex-none">
              <Button
                variant={mobileFiltersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="h-10 flex-1 sm:flex-none justify-between gap-2 text-xs font-semibold"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5 text-primary" /> Filters
                </span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="rounded-full px-1.5 py-0 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
                {mobileFiltersOpen ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-10 px-2.5">
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-8 grid gap-6 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr]">
          {/* Sidebar / Mobile Filters */}
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

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="keyword" className="text-xs">
                  Keyword
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="keyword"
                    className="pl-9 h-9 text-xs"
                    placeholder="wallet, laptop, keys…"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>All items (Lost &amp; Found)</SelectItem>
                    <SelectItem value="lost">Lost items only</SelectItem>
                    <SelectItem value="found">Found items only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs">
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
                <Label className="text-xs">Campus Geo-Zone</Label>
                <Select value={campusZone} onValueChange={setCampusZone}>
                  <SelectTrigger className="h-9 text-xs">
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
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-xs">
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
                <Label htmlFor="location" className="text-xs">
                  Location details
                </Label>
                <Input
                  id="location"
                  placeholder="Main Library, Lab 3…"
                  value={location}
                  className="h-9 text-xs"
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="from" className="text-xs">
                    From date
                  </Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    className="h-9 text-xs px-2"
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to" className="text-xs">
                    To date
                  </Label>
                  <Input
                    id="to"
                    type="date"
                    value={to}
                    className="h-9 text-xs px-2"
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Board Content */}
          <section className="space-y-6 min-w-0">
            {/* Campus Geo-Zone Quick Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
              {CAMPUS_ZONES.map((z) => {
                const isActive = campusZone === z.id;
                const shortLabel = z.id === "all" ? "All Zones" : (z.label.split("&")[0]?.trim() || z.label);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setCampusZone(z.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{z.icon}</span>
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 sm:p-12 text-center bg-card/50">
                <h2 className="text-xl font-semibold">No matches found</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Try widening your search keyword, selecting "All Zones", or clearing filters.
                </p>
                <Button className="mt-5" variant="outline" onClick={reset}>
                  Clear all filters
                </Button>
              </div>
            ) : viewMode === "rail" ? (
              /* Horizontal Swipe Rail / Carousel Deck View with Left/Right controls */
              <div className="relative group/rail">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{results.length} items</span>
                    <span>•</span>
                    <span>Swipe left &amp; right or use arrows</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-full shadow-xs"
                      onClick={() => scrollRail("left")}
                      title="Scroll left"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-full shadow-xs"
                      onClick={() => scrollRail("right")}
                      title="Scroll right"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>

                <div
                  ref={railRef}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-2 pb-6 no-scrollbar scroll-smooth overscroll-x-contain"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {results.map((item: ItemRow) => (
                    <ItemCard key={item.id} item={item} layout="rail" />
                  ))}
                </div>
              </div>
            ) : viewMode === "list" ? (
              /* List View Mode */
              <div className="flex flex-col gap-3">
                {results.map((item: ItemRow) => (
                  <ItemCard key={item.id} item={item} layout="list" />
                ))}
              </div>
            ) : (
              /* Responsive Grid View */
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((item: ItemRow) => (
                  <ItemCard key={item.id} item={item} layout="grid" />
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
