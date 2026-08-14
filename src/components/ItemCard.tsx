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
      className="group flex flex-col overflow-hidden rounded-lg border border-foreground/15 bg-card transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-foreground/15">
        <ItemImage
          path={item.image_url}
          category={item.category}
          alt={item.title}
          className="size-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge
            variant={item.item_type === "lost" ? "lost" : "found"}
            className="rule-label rounded-sm shadow-sm"
          >
            {item.item_type}
          </Badge>
          {zone && (
            <Badge
              variant="outline"
              className="rounded-sm bg-background/80 backdrop-blur text-[10px] shadow-sm"
            >
              {zone.icon} {zone.label.split("&")[0]?.trim()}
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
          {item.bumped_at && item.status === "open" && (
            <Badge
              variant="secondary"
              className="rounded-sm bg-primary/90 text-primary-foreground text-[10px] shadow-sm flex items-center gap-1"
            >
              <Rocket className="size-2.5" /> Bumped
            </Badge>
          )}
          {item.status !== "open" ? (
            <Badge variant="outline" className="rounded-sm bg-card/90 backdrop-blur text-[10px]">
              {item.status === "claimed"
                ? "Claim in progress"
                : item.status === "expired"
                  ? "Expired"
                  : "Resolved"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`rounded-sm text-[10px] backdrop-blur ${
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
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="rule-label text-muted-foreground">{item.category}</span>
        <h3 className="text-lg leading-snug font-bold">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {item.location || "Unspecified"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {formatDate(item.date_occurred)}
            </span>
          </div>
          {item.posted_by && <TrustBadge userId={item.posted_by} compact />}
        </div>
      </div>
    </Link>
  );
}
