import { Badge } from "@/components/ui/badge";
import type { Role } from "@/types/api";

/**
 * `deliveryman` is rendered but never offered — see ASSIGNABLE_ROLES. Hiding a
 * role a record actually carries would misrepresent the data.
 */
const VARIANTS: Record<Role, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  user: { label: "Customer", className: "bg-muted text-muted-foreground" },
  deliveryman: {
    label: "Delivery",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
};

export function RoleBadge({ role }: { role: Role }) {
  const { label, className } = VARIANTS[role];
  return <Badge className={className}>{label}</Badge>;
}
