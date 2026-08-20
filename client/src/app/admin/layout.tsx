import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // The real gate. proxy.ts only knows whether a cookie exists, not whose it is.
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-14 items-center gap-4 border-b px-4">
        <Link href="/admin" className="font-semibold tracking-tight">
          BabyMart <span className="text-muted-foreground font-normal">admin</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {admin.email}
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">
              <ArrowLeftIcon />
              Storefront
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        <AdminNav />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
