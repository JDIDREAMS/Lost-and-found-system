import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ItemImage } from "@/components/ItemImage";
import { formatDate, getDaysRemaining, CAMPUS_ZONES, type ItemRow } from "@/lib/lostfound";
import { TrustBadge } from "@/components/TrustBadge";
import { MapPin, CalendarDays, Rocket } from "lucide-react";

export function ItemCard({ item }: { item: ItemRow }) {
  const expiry = getDaysRemaining(item.created_at, item.expires_at);
  const zone = CAMPUS_ZONES.find((z) => z.id === item.campus_zone);

  return (
    <Link
      to="/items/$id"
      params={{ id: item.id }}
      className="@container group flex flex-col overflow-hidden rounded-xl border border-foreground/15 bg-card transition-all duration-200 hover:shadow-md hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden border-b border-foreground/10 bg-muted/30">
        <ItemImage
          path={item.image_url}
          category={item.category}
          alt={item.title}
          className="size-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
          <Badge
            variant={item.item_type === "lost" ? "lost" : "found"}
            className="rule-label rounded px-1.5 py-0.5 text-[9px] shadow-sm uppercase font-bold"
          >
            {item.item_type}
          </Badge>
          {zone && (
            <Badge
              variant="outline"
              className="rounded bg-background/85 backdrop-blur text-[9px] px-1.5 py-0.5 shadow-sm font-medium"
            >
              {zone.icon} {zone.label.split("&")[0]?.trim()}
            </Badge>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex flex-wrap items-center gap-1">
          {item.bumped_at && item.status === "open" && (
            <Badge
              variant="secondary"
              className="rounded bg-primary/90 text-primary-foreground text-[9px] px-1.5 py-0.5 shadow-sm flex items-center gap-1 font-medium"
            >
              <Rocket className="size-2.5" /> Bumped
            </Badge>
          )}
          {item.status !== "open" ? (
            <Badge variant="outline" className="rounded bg-card/90 backdrop-blur text-[9px] px-1.5 py-0.5 font-medium">
              {item.status === "claimed"
                ? "Claim in progress"
                : item.status === "expired"
                  ? "Expired"
                  : "Resolved"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`rounded text-[9px] px-1.5 py-0.5 backdrop-blur font-medium ${
                expiry.days <= 5
                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                  : "bg-background/80 text-muted-foreground"
              }`}
            >
              {expiry.text}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-[clamp(0.25rem,2cqi,0.5rem)] p-[clamp(0.75rem,5cqi,1rem)]">
        <span className="rule-label text-muted-foreground text-[length:clamp(0.55rem,3.5cqi,0.65rem)] tracking-wider">{item.category}</span>
        <h3 className="text-[length:clamp(0.875rem,6cqi,1.125rem)] leading-snug font-bold line-clamp-1 break-words">{item.title}</h3>
        <p className="line-clamp-2 text-[length:clamp(0.75rem,5cqi,0.875rem)] text-muted-foreground break-words leading-relaxed">{item.description}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-foreground/10 pt-[clamp(0.5rem,4cqi,0.75rem)] text-[length:clamp(0.65rem,4cqi,0.75rem)] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-[clamp(0.15rem,1cqi,0.25rem)]">
              <MapPin className="size-[clamp(0.7rem,4cqi,0.9rem)] shrink-0 text-primary/70" /> <span className="truncate max-w-[110px] sm:max-w-[130px]">{item.location || "Unspecified"}</span>
            </span>
            <span className="inline-flex items-center gap-[clamp(0.15rem,1cqi,0.25rem)] shrink-0">
              <CalendarDays className="size-[clamp(0.7rem,4cqi,0.9rem)] shrink-0 text-primary/70" /> {formatDate(item.date_occurred)}
            </span>
          </div>
          {item.posted_by && <TrustBadge userId={item.posted_by} compact />}
        </div>
      </div>
    </Link>
  );
}
