"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOffIcon } from "lucide-react";

import { canOptimise } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

/**
 * A product image from a URL we do not control.
 *
 * `products.image` is whatever an admin typed into the form, so neither the host
 * nor the URL's validity is knowable ahead of time. Two things go wrong in
 * practice and both are handled here:
 *
 *   - unknown host — next/image throws "hostname is not configured" and 500s the
 *     whole page, so anything off the allow-list renders as a plain <img>;
 *   - dead URL — a broken-image icon with the alt text sprawled across the card,
 *     so a failed load swaps in a neutral placeholder instead.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="text-muted-foreground absolute inset-0 grid place-items-center">
        <ImageOffIcon className="size-1/4 max-h-8 min-h-4" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  if (canOptimise(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- unknown host, see above
    <img
      // onError alone is not enough: this markup is server-rendered, so a dead
      // URL has usually already failed by the time React attaches the handler and
      // the event never fires. The ref catches that case — a finished load with
      // zero natural width is a broken image.
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}
