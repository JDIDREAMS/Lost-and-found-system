import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, HandHeart, MessagesSquare, ShieldCheck } from "lucide-react";
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
  const { data: recent } = useQuery<ItemRow[]>({
    queryKey: ["items", "supabase", "recent"],
    queryFn: async (): Promise<ItemRow[]> => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as ItemRow[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["items", "supabase", "stats"],
    queryFn: async () => {
      const [total, resolved, found] = await Promise.all([
        supabase.from("items").select("*", { count: "exact", head: true }),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("item_type", "found"),
      ]);
      return {
        total: total.count ?? 0,
        resolved: resolved.count ?? 0,
        found: found.count ?? 0,
      };
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="fluid-container py-6 md:py-10">
        {/* Bento hero */}
        <section className="grid gap-3 py-8 md:grid-cols-6 md:py-12">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-foreground/15 bg-card p-6 md:col-span-4 md:p-10">
            <div className="paper-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative">
              <span className="rule-label inline-flex items-center gap-2 text-muted-foreground">
                <HandHeart className="size-3.5" /> Students · Staff · Faculty
              </span>
              <h1 className="mt-6 text-4xl leading-[0.95] font-bold sm:text-5xl md:text-6xl lg:text-7xl">
                Lost it on campus?
                <br />
                Someone probably
                <br />
                found it.
              </h1>
              <p className="mt-5 max-w-md text-muted-foreground">
                One university-wide board for lost and found belongings — lecture halls, libraries,
                labs, hostels and shuttles — with claim requests, private messaging and
                notifications.
              </p>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-2">
              <Button size="lg" className="rounded-md" asChild>
                <Link to="/browse">
                  <Search className="size-4" /> Browse the board
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-md" asChild>
                <Link to="/post">
                  Report an item <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:col-span-2">
            <div className="overflow-hidden rounded-lg border border-foreground/15">
              <img
                src={heroImage}
                alt="A wooden lost and found tray holding keys, glasses, a scarf and a notebook"
                width={1600}
                height={1104}
                className="h-52 w-full object-cover md:h-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Posted", value: stats?.total ?? 0 },
                { label: "Found", value: stats?.found ?? 0 },
                { label: "Reunited", value: stats?.resolved ?? 0 },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-foreground/15 bg-card px-3 py-4"
                >
                  <div className="font-display text-xl sm:text-3xl leading-none font-bold">
                    {s.value}
                  </div>
                  <div className="rule-label mt-2 text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento: how it works */}
        <section className="grid gap-3 pb-12 md:grid-cols-6">
          {[
            {
              icon: Search,
              title: "Post & search",
              body: "Add a photo, category, campus location and date. Filter by building or block to narrow things down fast.",
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
              className={`rounded-lg border border-foreground/15 p-4 sm:p-6 ${f.span} ${f.tone}`}
            >
              <f.icon className="size-5" />
              <h2 className="mt-4 text-xl font-bold">{f.title}</h2>
              <p className="mt-2 max-w-xl text-sm opacity-70">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-foreground/15 py-12">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="rule-label text-muted-foreground">The board</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold truncate">Recently posted</h2>
            </div>
            <Button variant="ghost" asChild className="shrink-0 self-start sm:self-auto">
              <Link to="/browse">
                See all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div
            className="grid gap-[clamp(1rem,3vw,1.5rem)]"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 100%), 1fr))" }}
          >
            {(recent ?? []).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
