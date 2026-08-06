import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

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
  alt,
  className,
  eager,
}: {
  path: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const primaryPath = parseImagePaths(path)[0] ?? null;

  const [src, setSrc] = useState<string | null>(() => {
    if (!primaryPath) return null;
    const resolved = getImageUrl(primaryPath);
    if (resolved && (/^https?:\/\//.test(resolved) || resolved.startsWith("http"))) {
      return resolved;
    }
    return cache.get(primaryPath) ?? null;
  });

  useEffect(() => {
    if (!primaryPath) return;
    const resolved = getImageUrl(primaryPath);
    if (resolved && /^https?:\/\//.test(resolved)) {
      setSrc(resolved);
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
      });
    return () => {
      active = false;
    };
  }, [primaryPath]);

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface text-muted-foreground",
          className
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
