import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";

import { clearCartAction } from "@/actions/cart";
import { CartLine } from "@/components/shop/cart-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  // proxy.ts already bounced anonymous navigations; this is the check that counts.
  await requireUser("/cart");
  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="grid place-items-center gap-4 rounded-lg border border-dashed py-20 text-center">
        <ShoppingCartIcon className="text-muted-foreground size-8" />
        <div className="grid gap-1">
          <p className="font-medium">Your cart is empty</p>
          <p className="text-muted-foreground text-sm">Add something and it will show up here.</p>
        </div>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="grid content-start gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
          <form action={clearCartAction}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              Clear cart
            </Button>
          </form>
        </div>

        <ul className="divide-y border-y">
          {cart.items.map((item) => (
            <CartLine key={item.productId} item={item} />
          ))}
        </ul>
      </div>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items</span>
            <span className="tabular-nums">{cart.totalQuantity}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(cart.subtotal)}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            No shipping or tax in this build — the order total is the subtotal,
            re-priced from the database when the order is placed.
          </p>
        </CardContent>

        <CardFooter className="grid gap-2">
          {/* `asChild` renders a link, and `disabled` means nothing on an <a> —
              so an unorderable cart gets a real disabled button instead. */}
          {cart.orderable ? (
            <Button asChild className="w-full">
              <Link href="/checkout">Checkout</Link>
            </Button>
          ) : (
            <Button className="w-full" disabled>
              Checkout
            </Button>
          )}
          {!cart.orderable ? (
            <p className="text-destructive text-xs">
              One or more lines exceed available stock. Adjust the quantities above.
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
