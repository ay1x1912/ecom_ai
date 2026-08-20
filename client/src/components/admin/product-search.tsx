"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

export function ProductSearch() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <form
      action={(formData) => {
        const next = new URLSearchParams(params);
        const term = String(formData.get("search") ?? "").trim();
        if (term) next.set("search", term);
        else next.delete("search");
        next.delete("page");
        router.push(`/admin/products?${next.toString()}`);
      }}
      className="max-w-sm"
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
