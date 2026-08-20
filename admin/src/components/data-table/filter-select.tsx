"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix has no concept of an empty value, so "no filter" needs a sentinel. */
const ALL = "__all__";

export function FilterSelect({
  basePath,
  param,
  label,
  allLabel,
  options,
  className = "w-44",
}: {
  basePath: string;
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`filter-${param}`} className="text-xs">
        {label}
      </Label>
      <Select
        value={params.get(param) ?? ALL}
        onValueChange={(value) => {
          const next = new URLSearchParams(params);
          if (value === ALL) next.delete(param);
          else next.set(param, value);
          next.delete("page");
          router.push(`${basePath}?${next.toString()}`);
        }}
      >
        <SelectTrigger id={`filter-${param}`} className={className} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
