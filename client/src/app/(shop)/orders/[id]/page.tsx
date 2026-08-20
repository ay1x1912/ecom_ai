import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, ClockIcon, XCircleIcon } from "lucide-react";

import { OrderActions } from "@/app/(shop)/orders/[id]/order-actions";
import { OrderDetails } from "@/components/order-details";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  await requireUser();

  const { id } = await params;
  const order = await getOrder(id);

  // Covers both "no such order" and "someone else's order" — see lib/orders.ts.
  if (!order) notFound();

  return (
    <div className="grid gap-6">
      {order.status === "paid" ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-500" />
          <div>
            <p className="font-medium">Payment received</p>
            <p className="text-muted-foreground">
              We are getting your order ready. Thanks for shopping with us.
            </p>
          </div>
        </div>
      ) : null}

      {order.status === "pending" ? (
        <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
          <ClockIcon className="text-muted-foreground size-5" />
          <div>
            <p className="font-medium">Awaiting payment</p>
            <p className="text-muted-foreground">
              The items are held for you until this order is paid or cancelled.
            </p>
          </div>
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <div className="flex items-center gap-3 rounded-lg border p-4 text-sm">
          <XCircleIcon className="text-muted-foreground size-5" />
          <div>
            {/* Two paths lead here — the customer cancelled, or a payment failed
                and the backend cancelled on their behalf — and the order record
                cannot tell them apart, so the copy covers both rather than
                guessing from the payment reference. */}
            <p className="font-medium">Order cancelled</p>
            <p className="text-muted-foreground">
              Either you cancelled it or the payment was not completed. The stock
              has been returned. Cancelling is final — start a new order to buy
              these items.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/orders">All orders</Link>
          </Button>
          <OrderActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <OrderDetails order={order} />
    </div>
  );
}
