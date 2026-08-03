import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, HandHeart, MessagesSquare, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/hero-lostfound.jpg";
import { supabase } from "@/integrations/supabase/client";
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
        content: "Post lost or found items, search the board, and reunite people with what matters.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: recent } = useQuery({
    queryKey: ["items", "recent"],
    queryFn: async () => {
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
    queryKey: ["items", "stats"],
    queryFn: async () => {
      const [total, resolved, found] = await Promise.all([
        supabase.from("items").select("*", { count: "exact", head: true }),
        supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("status", "resolved"),
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

      <main>
        <section className="relative overflow-hidden border-b">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <HandHeart className="size-3.5 text-accent" /> For students, staff and faculty on
                campus
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
                Lost it on campus? Someone probably found it.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                One university-wide board for lost and found belongings — lecture halls, libraries,
                labs, hostels and shuttles — with claim requests, private messaging and
                notifications so things actually make it back.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/browse">
                    <Search className="size-4" /> Browse the board
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/post">
                    Report an item <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
                {[
                  { label: "Items posted", value: stats?.total ?? 0 },
                  { label: "Found reports", value: stats?.found ?? 0 },
                  { label: "Reunited", value: stats?.resolved ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border bg-card p-4 shadow-soft">
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                    <dd className="font-display text-2xl font-semibold">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl paper-grid opacity-70" />
              <img
                src={heroImage}
                alt="A wooden lost and found tray holding keys, glasses, a scarf and a notebook"
                width={1600}
                height={1104}
                className="w-full rounded-2xl border object-cover shadow-lift"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Post & search",
                body: "Add a photo, category, campus location and date. Filter the board by building or block to narrow things down fast.",
              },
              {
                icon: ShieldCheck,
                title: "Claim with proof",
                body: "Claimants describe the item privately. The poster approves or rejects — no public phone numbers.",
              },
              {
                icon: MessagesSquare,
                title: "Message & meet",
                body: "A private thread opens per claim, so you can arrange a handover at the department office or security desk.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
                <f.icon className="size-6 text-primary" />
                <h2 className="mt-4 text-xl font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-3xl font-semibold">Recently posted</h2>
            <Button variant="ghost" asChild>
              <Link to="/browse">
                See all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
