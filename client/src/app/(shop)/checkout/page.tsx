import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddressForm } from "@/components/shop/address-form";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCart();

  // Nothing to check out, or a line that now exceeds stock — the cart page is
  // where both are fixable.
  if (!cart || !cart.orderable) redirect("/cart");

  const addresses = user.addresses ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

        {addresses.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutForm addresses={addresses} total={cart.subtotal} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Add a shipping address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                An order ships to a saved address, so this is needed before you can
                pay. It takes a moment and is reusable next time.
              </p>
              <AddressForm isFirst />
            </CardContent>
          </Card>
        )}

        {addresses.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add another address</CardTitle>
            </CardHeader>
            <CardContent>
              <AddressForm isFirst={false} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <ul className="grid gap-2">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span className="text-muted-foreground line-clamp-1">
                  {item.quantity} × {item.product?.name ?? "Unavailable product"}
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(cart.subtotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
