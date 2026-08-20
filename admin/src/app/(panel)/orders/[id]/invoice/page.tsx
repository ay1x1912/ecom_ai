import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { PrintButton } from "@/app/(panel)/orders/[id]/invoice/print-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getOrder } from "@/lib/resources";

export const metadata: Metadata = { title: "Invoice" };

/**
 * A printable invoice, deliberately unbranded.
 *
 * No logo, no company address, no separate invoice numbering — none of that
 * exists in our data, and printing it would mean inventing it. Likewise there is
 * no tax or shipping line: the API sets `total = subtotal` outright, so a
 * "Shipping: $0.00" row would imply a calculation that never happened.
 *
 * Everything below is read off the order record, which snapshots its line items
 * at the moment it was placed — so reprinting an old invoice does not pick up
 * later edits to a product.
 */
export default async function InvoicePage({
  params,
}: PageProps<"/orders/[id]/invoice">) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div data-print-hide className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orders/${order.id}`}>
            <ChevronLeftIcon />
            Back to order
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="bg-background rounded-lg border p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Order {order.orderNumber}
            </p>
          </div>
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Order date</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{order.status}</dd>
            </div>
            {order.payment.paidAt ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{formatDateTime(order.payment.paidAt)}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <Separator className="my-6" />

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Billed to
            </h2>
            <div className="mt-2 grid gap-0.5 text-sm">
              {order.customer ? (
                <>
                  <span className="font-medium">{order.customer.name}</span>
                  <span className="text-muted-foreground">{order.customer.email}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Account removed</span>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ship to
            </h2>
            <div className="mt-2 grid gap-0.5 text-sm">
              <span>{order.shippingAddress.street}</span>
              <span>{order.shippingAddress.city}</span>
              <span>{order.shippingAddress.postalCode}</span>
              <span>{order.shippingAddress.country}</span>
            </div>
          </section>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(item.price)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div data-print-keep className="mt-6 flex justify-end">
          <dl className="grid w-56 gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </div>

        {order.payment.reference ? (
          <footer className="text-muted-foreground mt-8 text-xs">
            <p>
              Paid by {order.payment.provider} · reference{" "}
              <span className="font-mono">{order.payment.reference}</span>
            </p>
          </footer>
        ) : null}
      </article>
    </div>
  );
}
