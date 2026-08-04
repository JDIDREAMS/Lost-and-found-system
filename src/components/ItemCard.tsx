import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ItemImage } from "@/components/ItemImage";
import { formatDate, type ItemRow } from "@/lib/lostfound";
import { MapPin, CalendarDays } from "lucide-react";

export function ItemCard({ item }: { item: ItemRow }) {
  return (
    <Link
      to="/items/$id"
      params={{ id: item.id }}
      className="group flex flex-col overflow-hidden rounded-lg border border-foreground/15 bg-card transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-foreground/15">
        <ItemImage
          path={item.image_url}
          alt={item.title}
          className="size-full transition-transform duration-500 group-hover:scale-105"
        />
        <Badge
          variant={item.item_type === "lost" ? "lost" : "found"}
          className="rule-label absolute top-3 left-3 rounded-sm"
        >
          {item.item_type}
        </Badge>
        {item.status !== "open" && (
          <Badge
            variant="outline"
            className="absolute top-3 right-3 rounded-sm bg-card/90 backdrop-blur"
          >
            {item.status === "claimed" ? "Claim in progress" : "Resolved"}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="rule-label text-muted-foreground">{item.category}</span>
        <h3 className="text-lg leading-snug font-bold">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {item.location || "Unspecified"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" /> {formatDate(item.date_occurred)}
          </span>
        </div>
      </div>
    </Link>

  );
}
