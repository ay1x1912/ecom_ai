"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types/api";

/**
 * Filters write to the URL, not to state.
 *
 * Everything below is a controlled read of `useSearchParams` and a `router.push`
 * on change; the server re-renders the list. That is what makes a filtered view
 * shareable and the back button correct.
 */

/** The backend takes sortBy + sortOrder separately; the UI is one dropdown. */
const SORTS = {
  newest: { sortBy: "createdAt", sortOrder: "desc", label: "Newest" },
  "price-asc": { sortBy: "price", sortOrder: "asc", label: "Price: low to high" },
  "price-desc": { sortBy: "price", sortOrder: "desc", label: "Price: high to low" },
  "name-asc": { sortBy: "name", sortOrder: "asc", label: "Name: A–Z" },
  rating: { sortBy: "averageRating", sortOrder: "desc", label: "Top rated" },
} as const;

type SortKey = keyof typeof SORTS;

const ALL = "all";

export function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    // Any filter change invalidates the current page number.
    next.delete("page");
    router.push(`/products?${next.toString()}`);
  };

  const currentSort = (Object.keys(SORTS) as SortKey[]).find(
    (key) =>
      SORTS[key].sortBy === params.get("sortBy") &&
      SORTS[key].sortOrder === params.get("sortOrder"),
  );

  const categoryId = params.get("categoryId") ?? ALL;
  const inStockOnly = params.get("inStock") === "true";
  const hasFilters = Boolean(
    params.get("categoryId") ?? params.get("sortBy") ?? params.get("inStock") ?? params.get("search"),
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="filter-category" className="text-xs">
          Category
        </Label>
        <Select
          value={categoryId}
          onValueChange={(value) => update({ categoryId: value === ALL ? null : value })}
        >
          <SelectTrigger id="filter-category" className="w-44" size="sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="filter-sort" className="text-xs">
          Sort by
        </Label>
        <Select
          value={currentSort ?? "newest"}
          onValueChange={(value) =>
            update({
              sortBy: SORTS[value as SortKey].sortBy,
              sortOrder: SORTS[value as SortKey].sortOrder,
            })
          }
        >
          <SelectTrigger id="filter-sort" className="w-48" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORTS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant={inStockOnly ? "default" : "outline"}
        size="sm"
        onClick={() => update({ inStock: inStockOnly ? null : "true" })}
        aria-pressed={inStockOnly}
      >
        In stock only
      </Button>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => router.push("/products")}>
          <XIcon />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
