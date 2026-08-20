import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/api";

/** One mapping of status → colour, shared by the storefront and the admin panel. */
const VARIANTS: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  completed: {
    label: "Completed",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = VARIANTS[status];
  return <Badge className={className}>{label}</Badge>;
}
