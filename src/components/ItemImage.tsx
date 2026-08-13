import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Electronics: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80",
  "Student ID & Cards": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop&q=80",
  "Books & Notes": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
  Wallets: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
  Keys: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80",
  Bags: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
  Documents: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
  "Lab & Sports Gear": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80",
  Jewellery: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80",
  Clothing: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
  Accessories: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80",
  Pets: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80",
  Other: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80",
};

export function parseImagePaths(pathStr: string | null): string[] {
  if (!pathStr) return [];
  try {
    if (pathStr.startsWith("[") && pathStr.endsWith("]")) {
      const parsed = JSON.parse(pathStr);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch {
    // Fall back to single path
  }
  return [pathStr];
}

/** Resolves an image reference (storage path, backend static URL, JSON array, or absolute URL) to a displayable src. */
export function ItemImage({
  path,
  category,
  alt,
  className,
  eager,
}: {
  path: string | null;
  category?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const primaryPath = parseImagePaths(path)[0] ?? null;
  const fallbackSrc = category && CATEGORY_FALLBACK_IMAGES[category]
    ? CATEGORY_FALLBACK_IMAGES[category]
    : CATEGORY_FALLBACK_IMAGES["Other"]!;

  const getDirectSrc = (p: string | null): string | null => {
    if (!p) return null;
    const resolved = getImageUrl(p);
    if (!resolved) return null;
    if (/^https?:\/\//.test(resolved) || resolved.startsWith("/") || resolved.startsWith("data:")) {
      return resolved;
    }
    return null;
  };

  const [src, setSrc] = useState<string>(() => {
    const direct = getDirectSrc(primaryPath);
    if (direct) return direct;
    if (primaryPath && cache.has(primaryPath)) return cache.get(primaryPath)!;
    return fallbackSrc;
  });

  useEffect(() => {
    if (!primaryPath) {
      setSrc(fallbackSrc);
      return;
    }
    const direct = getDirectSrc(primaryPath);
    if (direct) {
      setSrc(direct);
      return;
    }

    if (cache.has(primaryPath)) {
      setSrc(cache.get(primaryPath)!);
      return;
    }

    let active = true;
    void supabase.storage
      .from("item-images")
      .createSignedUrl(primaryPath, 60 * 60)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(primaryPath, data.signedUrl);
        setSrc(data.signedUrl);
      })
      .catch(() => {
        if (active) setSrc(fallbackSrc);
      });

    return () => {
      active = false;
    };
  }, [primaryPath, fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onError={() => {
        if (src !== fallbackSrc) setSrc(fallbackSrc);
      }}
      className={cn("object-cover", className)}
    />
  );
}
