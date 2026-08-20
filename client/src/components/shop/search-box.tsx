"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Search is a URL, not component state.
 *
 * Submitting navigates to /products?search=…, which means results are
 * server-rendered, shareable, and correct when someone hits the back button.
 */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      className={className}
      action={(formData) => {
        const next = new URLSearchParams(params);
        const term = String(formData.get("search") ?? "").trim();

        if (term) next.set("search", term);
        else next.delete("search");
        // A new search starts at page one; keeping ?page=4 would land on an
        // empty page more often than not.
        next.delete("page");

        router.push(`/products?${next.toString()}`);
      }}
    >
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          name="search"
          type="search"
          placeholder="Search products…"
          defaultValue={params.get("search") ?? ""}
          className="pl-9"
          aria-label="Search products"
        />
      </div>
    </form>
  );
}
