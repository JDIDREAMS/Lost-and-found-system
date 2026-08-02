import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

/** Resolves an image reference (storage path or absolute URL) to a displayable src. */
export function ItemImage({
  path,
  alt,
  className,
  eager,
}: {
  path: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(() =>
    path && /^https?:\/\//.test(path) ? path : path ? (cache.get(path) ?? null) : null,
  );

  useEffect(() => {
    if (!path || /^https?:\/\//.test(path)) return;
    if (cache.has(path)) {
      setSrc(cache.get(path)!);
      return;
    }
    let active = true;
    void supabase.storage
      .from("item-images")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setSrc(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface text-muted-foreground",
          className,
        )}
        aria-hidden="true"
      >
        <ImageOff className="size-6 opacity-50" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      className={cn("object-cover", className)}
    />
  );
}
