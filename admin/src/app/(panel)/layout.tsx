import Link from "next/link";

import { AccountMenu } from "@/components/panel/account-menu";
import { SidebarNav } from "@/components/panel/sidebar-nav";
import { requireAdmin } from "@/lib/session";

/** Where the "Storefront" link points. Same host, the client app's port. */
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "http://localhost:3000";

export default async function PanelLayout({ children }: LayoutProps<"/"> ) {
  // The gate. proxy.ts only knows whether a cookie exists, not whose it is.
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header
        data-print-hide
        className="flex h-14 shrink-0 items-center gap-4 border-b px-4"
      >
        <Link href="/" className="font-semibold tracking-tight">
          BabyMart <span className="text-muted-foreground font-normal">admin</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {admin.email}
          </span>
          <AccountMenu
            name={admin.name}
            email={admin.email}
            storefrontUrl={STOREFRONT_URL}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        <aside data-print-hide className="border-b sm:border-r sm:border-b-0">
          <SidebarNav />
        </aside>
        <main data-print-page className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
