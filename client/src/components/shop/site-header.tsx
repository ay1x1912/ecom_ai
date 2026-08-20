import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";

import { SearchBox } from "@/components/shop/search-box";
import { UserMenu } from "@/components/shop/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { getSession } from "@/lib/session";

export async function SiteHeader() {
  // Both are React-cached, so the page below can call them again for free.
  const [user, cart] = await Promise.all([getSession(), getCart()]);
  const count = cart?.totalQuantity ?? 0;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/products" className="shrink-0 text-lg font-semibold tracking-tight">
          BabyMart
        </Link>

        <SearchBox className="ml-2 hidden flex-1 sm:block" />

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Cart" className="relative">
            <Link href="/cart">
              <ShoppingCartIcon />
              {count > 0 ? (
                <Badge
                  className="absolute -top-1 -right-1 size-5 justify-center rounded-full p-0 text-[10px] tabular-nums"
                  aria-label={`${count} items in cart`}
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              ) : null}
            </Link>
          </Button>

          {user ? (
            <UserMenu name={user.name} email={user.email} role={user.role} />
          ) : (
            <Button size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:hidden">
        <SearchBox />
      </div>
    </header>
  );
}
