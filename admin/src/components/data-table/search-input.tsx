"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Search that navigates rather than filters in place.
 *
 * Submitting rewrites the URL and the server re-renders the list from the API.
 * Deliberately not debounced-as-you-type: each keystroke would be a database
 * query, and the Enter key is a clearer signal than a timer.
 */
export function SearchInput({
  basePath,
  placeholder = "Search…",
}: {
  basePath: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      className="w-full max-w-xs"
      action={(formData) => {
        const next = new URLSearchParams(params);
        const term = String(formData.get("search") ?? "").trim();

        if (term) next.set("search", term);
        else next.delete("search");
        // A new search starts at page one; keeping ?page=4 usually lands empty.
        next.delete("page");

        router.push(`${basePath}?${next.toString()}`);
      }}
    >
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          name="search"
          type="search"
          placeholder={placeholder}
          defaultValue={params.get("search") ?? ""}
          className="pl-9"
          aria-label={placeholder}
        />
      </div>
    </form>
  );
}
