import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ItemImage } from "@/components/ItemImage";
import { formatDate, getDaysRemaining, CAMPUS_ZONES, type ItemRow } from "@/lib/lostfound";
import { TrustBadge } from "@/components/TrustBadge";
import { MapPin, CalendarDays, Rocket } from "lucide-react";

export function ItemCard({
  item,
  layout = "grid",
  className = "",
}: {
  item: ItemRow;
  layout?: "grid" | "list" | "rail";
  className?: string;
}) {
  const expiry = getDaysRemaining(item.created_at, item.expires_at);
  const zone = CAMPUS_ZONES.find(
    (z) =>
      z.id !== "all" &&
      (z.id === item.campus_zone ||
        (z.id === "student_union" && item.campus_zone === "union")),
  );

  if (layout === "list") {
    return (
      <Link
        to="/items/$id"
        params={{ id: item.id }}
        className={`group flex flex-col sm:flex-row items-stretch overflow-hidden rounded-xl border border-foreground/15 bg-card transition-all duration-200 hover:shadow-md hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.99] ${className}`}
      >
        <div className="relative aspect-[16/9] sm:aspect-square sm:w-44 md:w-52 shrink-0 overflow-hidden border-b sm:border-b-0 sm:border-r border-foreground/10 bg-muted/30">
          <ItemImage
            path={item.image_url}
            category={item.category}
            alt={item.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge
              variant={item.item_type === "lost" ? "lost" : "found"}
              className="rule-label rounded px-1.5 py-0.5 text-[9px] shadow-sm uppercase font-bold"
            >
              {item.item_type}
            </Badge>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4 gap-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="rule-label text-muted-foreground text-[10px] tracking-wider">
                {item.category}
              </span>
              <div className="flex items-center gap-1.5">
                {zone && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {zone.icon} {zone.label.split("&")[0]?.trim()}
                  </Badge>
                )}
                {item.status !== "open" ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.status === "claimed" ? "Claiming" : item.status}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      expiry.days <= 5 ? "bg-red-500/10 text-red-600" : "text-muted-foreground"
                    }`}
                  >
                    {expiry.text}
                  </Badge>
                )}
              </div>
            </div>
            <h3 className="mt-1 text-base sm:text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground">
              {item.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-primary/70" />
                <span className="truncate max-w-[140px]">{item.location || "Unspecified"}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5 text-primary/70" />
                {formatDate(item.date_occurred)}
              </span>
            </div>
            {item.posted_by && <TrustBadge userId={item.posted_by} compact />}
          </div>
        </div>
      </Link>
    );
  }

  const isRail = layout === "rail";

  return (
    <Link
      to="/items/$id"
      params={{ id: item.id }}
      className={`@container group flex flex-col overflow-hidden rounded-xl border border-foreground/15 bg-card transition-all duration-200 hover:shadow-md hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.99] ${
        isRail ? "w-[260px] sm:w-[290px] md:w-[310px] shrink-0 snap-start" : "w-full"
      } ${className}`}
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
            <Badge
              variant="outline"
              className="rounded bg-card/90 backdrop-blur text-[9px] px-1.5 py-0.5 font-medium"
            >
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
        <span className="rule-label text-muted-foreground text-[length:clamp(0.55rem,3.5cqi,0.65rem)] tracking-wider">
          {item.category}
        </span>
        <h3 className="text-[length:clamp(0.875rem,6cqi,1.125rem)] leading-snug font-bold line-clamp-1 break-words group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-[length:clamp(0.75rem,5cqi,0.875rem)] text-muted-foreground break-words leading-relaxed">
          {item.description}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-foreground/10 pt-[clamp(0.5rem,4cqi,0.75rem)] text-[length:clamp(0.65rem,4cqi,0.75rem)] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-[clamp(0.15rem,1cqi,0.25rem)]">
              <MapPin className="size-[clamp(0.7rem,4cqi,0.9rem)] shrink-0 text-primary/70" />{" "}
              <span className="truncate max-w-[110px] sm:max-w-[130px]">
                {item.location || "Unspecified"}
              </span>
            </span>
            <span className="inline-flex items-center gap-[clamp(0.15rem,1cqi,0.25rem)] shrink-0">
              <CalendarDays className="size-[clamp(0.7rem,4cqi,0.9rem)] shrink-0 text-primary/70" />{" "}
              {formatDate(item.date_occurred)}
            </span>
          </div>
          {item.posted_by && <TrustBadge userId={item.posted_by} compact />}
        </div>
      </div>
    </Link>
  );
}
