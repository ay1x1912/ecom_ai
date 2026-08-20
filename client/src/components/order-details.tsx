import { ProductImage } from "@/components/shop/product-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Order } from "@/types/api";

/**
 * The read-only body of an order — items, address, payment.
 *
 * Shared by the customer's confirmation page and the admin's order view, because
 * they show the same record; only the controls around it differ.
 */
export function OrderDetails({
  order,
  showCustomer = false,
}: {
  order: Order;
  /** Admin views need to know whose order this is; the owner already knows. */
  showCustomer?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {order.items.length} {order.items.length === 1 ? "item" : "items"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-md border">
                  {item.image ? (
                    <ProductImage src={item.image} alt={item.name} sizes="3.5rem" />
                  ) : null}
                </div>
                <div className="grid flex-1 gap-0.5">
                  {/* Name and price are snapshots taken when the order was placed —
                      they do not follow later edits to the product. */}
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {item.quantity} × {formatMoney(item.price)}
                  </span>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatMoney(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="grid gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground grid gap-0.5 text-sm">
            <span className="text-foreground">{order.shippingAddress.street}</span>
            <span>{order.shippingAddress.city}</span>
            <span>{order.shippingAddress.postalCode}</span>
            <span>{order.shippingAddress.country}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          {/* A two-column grid rather than flex rows: the payment reference is a
              40-character session id, and in a flex row it pushes the label out of
              the card instead of truncating. */}
          <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <span className="text-muted-foreground">Provider</span>
            <span className="text-right">{order.payment.provider ?? "—"}</span>

            <span className="text-muted-foreground">Reference</span>
            <span className="truncate text-right font-mono text-xs" title={order.payment.reference ?? undefined}>
              {order.payment.reference ?? "—"}
            </span>

            <span className="text-muted-foreground">Paid at</span>
            <span className="text-right">{formatDateTime(order.payment.paidAt)}</span>
          </CardContent>
        </Card>

        {showCustomer && order.customer ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-0.5 text-sm">
              <span>{order.customer.name}</span>
              <span className="text-muted-foreground">{order.customer.email}</span>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
