import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, MapPin, Calendar, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { api, ScoredMatch, Item } from "@/lib/api";
import { ItemImage } from "./ItemImage";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { formatDateTime } from "@/lib/lostfound";

interface SmartMatchesWidgetProps {
  itemId: string;
  itemType: "lost" | "found";
  title: string;
}

export function SmartMatchesWidget({ itemId, itemType, title }: SmartMatchesWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["smart-matches", itemId],
    queryFn: async () => {
      try {
        const res = await api.getItemMatches(itemId, 40);
        return res.matches;
      } catch (err) {
        console.warn("Failed to fetch smart matches:", err);
        return [] as ScoredMatch[];
      }
    },
    staleTime: 30000,
  });

  const matches = data ?? [];
  const counterpartLabel = itemType === "lost" ? "Found Reports" : "Lost Reports";

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">
              Smart Potential Matches
            </h3>
            <p className="text-xs text-muted-foreground">
              AI auto-matching against active {counterpartLabel}
            </p>
          </div>
        </div>
        {matches.length > 0 && (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary"
          >
            {matches.length} {matches.length === 1 ? "match" : "matches"} found
          </Badge>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
            <Sparkles className="mx-auto size-6 text-muted-foreground/50" />
            <p className="mt-2 text-xs font-medium text-foreground">
              No strong counterpart matches yet
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              We'll continuously scan incoming {counterpartLabel.toLowerCase()} and alert you
              automatically when a match appears.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {matches.map((match) => {
              const matchedItem = match.item;
              const isHigh = match.score >= 70;

              return (
                <div
                  key={matchedItem.id}
                  className="group relative overflow-hidden rounded-xl border border-border/80 bg-background/80 p-3.5 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg border bg-surface">
                      <ItemImage
                        path={matchedItem.image_url}
                        category={matchedItem.category}
                        alt={matchedItem.title}
                        className="size-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <Link
                          to="/items/$id"
                          params={{ id: matchedItem.id }}
                          className="truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {matchedItem.title}
                        </Link>
                        <Badge
                          className={`text-[11px] font-bold ${
                            isHigh
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {match.score}% Match
                        </Badge>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground/70" />
                          {matchedItem.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground/70" />
                          {matchedItem.date_occurred}
                        </span>
                      </div>

                      {match.reasons && match.reasons.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {match.reasons.map((reason: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground/80"
                            >
                              <Tag className="size-2.5 text-primary/70" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground">
                          Posted by {matchedItem.poster_name || "Campus Member"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs text-primary hover:bg-primary/10"
                          asChild
                        >
                          <Link to="/items/$id" params={{ id: matchedItem.id }}>
                            View details <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
