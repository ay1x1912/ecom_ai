import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, PrinterIcon } from "lucide-react";

import { DeleteOrderButton } from "@/app/(panel)/orders/[id]/delete-order-button";
import { OrderDetails } from "@/components/order-details";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderStatusControl } from "@/components/panel/order-status-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getOrder } from "@/lib/resources";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <div className="grid gap-6">
      <Link
        href="/orders"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
          <span className="text-muted-foreground text-sm">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orders/${order.id}/invoice`}>
              <PrinterIcon />
              Invoice
            </Link>
          </Button>
          <DeleteOrderButton orderId={order.id} orderNumber={order.orderNumber} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change status</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusControl orderId={order.id} status={order.status} />
        </CardContent>
      </Card>

      <OrderDetails order={order} showCustomer />
    </div>
  );
}
