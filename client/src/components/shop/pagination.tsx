import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/api";

/**
 * Link-based pagination.
 *
 * Real <a> elements rather than router pushes, so pages are crawlable, openable
 * in a new tab, and work without JavaScript. The current query string is carried
 * over so paging never silently drops the active filters.
 */
export function Pagination({
  meta,
  basePath,
  params,
}: {
  meta: PaginationMeta;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (meta.totalPages <= 1) return null;

  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    query.set("page", String(page));
    return `${basePath}?${query.toString()}`;
  };

  const previous = meta.page > 1 ? meta.page - 1 : null;
  const next = meta.page < meta.totalPages ? meta.page + 1 : null;
  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");

  return (
    <nav className="flex items-center justify-center gap-3 pt-8" aria-label="Pagination">
      {previous ? (
        <Link href={href(previous)} className={linkClass} rel="prev">
          <ChevronLeftIcon />
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden>
          <ChevronLeftIcon />
          Previous
        </span>
      )}

      <span className="text-muted-foreground text-sm tabular-nums">
        Page {meta.page} of {meta.totalPages}
      </span>

      {next ? (
        <Link href={href(next)} className={linkClass} rel="next">
          Next
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden>
          Next
          <ChevronRightIcon />
        </span>
      )}
    </nav>
  );
}
