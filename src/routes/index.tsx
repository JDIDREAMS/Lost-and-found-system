import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Search,
  HandHeart,
  MessagesSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
} from "lucide-react";
import heroImage from "@/assets/hero-lostfound.jpg";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import type { ItemRow } from "@/lib/lostfound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FoundIt — Campus Lost & Found" },
      {
        name: "description",
        content:
          "Post lost or found items, search the board by category and location, and message safely to return belongings to their owners.",
      },
      { property: "og:title", content: "FoundIt — Campus Lost & Found" },
      {
        property: "og:description",
        content:
          "Post lost or found items, search the board, and reunite people with what matters.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [layoutMode, setLayoutMode] = useState<"rail" | "grid">("rail");
  const homeRailRef = useRef<HTMLDivElement>(null);

  const scrollRail = (direction: "left" | "right") => {
    if (homeRailRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      homeRailRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const { data: recent } = useQuery<ItemRow[]>({
    queryKey: ["items", "recent-home"],
    queryFn: async (): Promise<ItemRow[]> => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);
        if (error) throw error;
        return (data ?? []) as ItemRow[];
      } catch (err) {
        console.warn("Supabase fetch failed, falling back to API...", err);
        const { items } = await api.getItems();
        return (items ?? []).slice(0, 8) as ItemRow[];
      }
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["items", "supabase", "stats"],
    queryFn: async () => {
      try {
        const [total, resolved, found] = await Promise.all([
          supabase.from("items").select("*", { count: "exact", head: true }),
          supabase
            .from("items")
            .select("*", { count: "exact", head: true })
            .eq("status", "resolved"),
          supabase
            .from("items")
            .select("*", { count: "exact", head: true })
            .eq("item_type", "found"),
        ]);
        return {
          total: total.count ?? 0,
          resolved: resolved.count ?? 0,
          found: found.count ?? 0,
        };
      } catch {
        return { total: 0, resolved: 0, found: 0 };
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="fluid-container flex-1 py-6 md:py-10">
        {/* Bento hero */}
        <section className="grid gap-3 py-6 md:grid-cols-6 md:py-10">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-foreground/15 bg-card p-6 sm:p-8 md:col-span-4 md:p-10 shadow-soft">
            <div className="paper-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative">
              <span className="rule-label inline-flex items-center gap-2 text-muted-foreground">
                <HandHeart className="size-3.5" /> Students · Staff · Faculty
              </span>
              <h1 className="mt-4 sm:mt-6 text-3xl leading-[1.05] font-bold sm:text-5xl md:text-6xl lg:text-7xl break-words">
                Lost it on campus?
                <br />
                Someone probably
                <br />
                found it.
              </h1>
              <p className="mt-4 sm:mt-5 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
                One university-wide board for lost and found belongings — lecture halls, libraries,
                labs, hostels and shuttles — with claim verification, private messaging and instant
                notifications.
              </p>
            </div>
            <div className="relative mt-6 sm:mt-8 flex flex-wrap gap-2.5">
              <Button size="lg" className="rounded-xl flex-1 sm:flex-none h-11" asChild>
                <Link to="/browse">
                  <Search className="size-4" /> Browse the board
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl flex-1 sm:flex-none h-11"
                asChild
              >
                <Link to="/post">
                  Report an item <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-foreground/15 shadow-soft">
              <img
                src={heroImage}
                alt="A wooden lost and found tray holding keys, glasses, a scarf and a notebook"
                width={1600}
                height={1104}
                className="h-44 sm:h-52 w-full object-cover md:h-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Posted", value: stats?.total ?? 0 },
                { label: "Found", value: stats?.found ?? 0 },
                { label: "Reunited", value: stats?.resolved ?? 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-foreground/15 bg-card p-3 sm:px-3 sm:py-4 shadow-soft text-center"
                >
                  <div className="font-display text-lg sm:text-2xl md:text-3xl leading-none font-bold">
                    {s.value}
                  </div>
                  <div className="rule-label mt-1.5 text-[9px] sm:text-[10px] text-muted-foreground truncate">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento: how it works */}
        <section className="grid gap-3 pb-10 md:grid-cols-6">
          {[
            {
              icon: Search,
              title: "Post & search",
              body: "Add a photo, category, campus location and date. Filter by building or zone to narrow things down fast.",
              span: "md:col-span-3",
              tone: "bg-foreground text-background",
            },
            {
              icon: ShieldCheck,
              title: "Claim with proof",
              body: "Claimants describe the item privately. The poster approves or rejects — no public phone numbers.",
              span: "md:col-span-3",
              tone: "bg-card",
            },
            {
              icon: MessagesSquare,
              title: "Message & meet",
              body: "A private thread opens per claim, so you can arrange a handover at the department office or security desk.",
              span: "md:col-span-6",
              tone: "bg-surface",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border border-foreground/15 p-5 sm:p-6 ${f.span} ${f.tone} shadow-soft`}
            >
              <f.icon className="size-5" />
              <h2 className="mt-3 text-lg sm:text-xl font-bold">{f.title}</h2>
              <p className="mt-1.5 max-w-xl text-xs sm:text-sm opacity-80 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </section>

        {/* Recent Items Section */}
        <section className="border-t border-foreground/15 py-8 sm:py-12">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="rule-label text-muted-foreground">The board</span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold truncate">Recently posted</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Swipe left &amp; right or browse the full collection
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border bg-card p-1 shadow-xs">
                <Button
                  variant={layoutMode === "rail" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setLayoutMode("rail")}
                  title="Swipe Rail view"
                >
                  <Layers className="size-3" />
                  <span>Swipe</span>
                </Button>
                <Button
                  variant={layoutMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setLayoutMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="size-3" />
                  <span>Grid</span>
                </Button>
              </div>

              {layoutMode === "rail" && (
                <div className="flex items-center gap-1">
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
              )}

              <Button variant="ghost" size="sm" asChild className="shrink-0 text-xs">
                <Link to="/browse">
                  See all <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          {layoutMode === "rail" ? (
            <div
              ref={homeRailRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-2 pb-6 no-scrollbar scroll-smooth overscroll-x-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {(recent ?? []).map((item) => (
                <ItemCard key={item.id} item={item} layout="rail" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(recent ?? []).map((item) => (
                <ItemCard key={item.id} item={item} layout="grid" />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
