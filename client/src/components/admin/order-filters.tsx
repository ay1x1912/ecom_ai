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
import { ORDER_STATUSES } from "@/types/api";

const ALL = "all";

/** Status filter, in the URL so a filtered order list can be linked to. */
export function OrderFilters() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="order-status" className="text-xs">
        Status
      </Label>
      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(value) => {
          const next = new URLSearchParams(params);
          if (value === ALL) next.delete("status");
          else next.set("status", value);
          next.delete("page");
          router.push(`/admin/orders?${next.toString()}`);
        }}
      >
        <SelectTrigger id="order-status" className="w-44" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {ORDER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status[0].toUpperCase() + status.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
