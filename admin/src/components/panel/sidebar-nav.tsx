"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ImageIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingBagIcon,
  TagIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/orders", label: "Orders", icon: ShoppingBagIcon },
  { href: "/products", label: "Products", icon: PackageIcon },
  { href: "/categories", label: "Categories", icon: TagsIcon },
  { href: "/brands", label: "Brands", icon: TagIcon },
  { href: "/banners", label: "Banners", icon: ImageIcon },
  { href: "/users", label: "Users", icon: UsersIcon },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto p-2 sm:w-52 sm:flex-col sm:overflow-visible sm:p-3">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        // "/" would prefix-match every route, so the dashboard matches exactly.
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
