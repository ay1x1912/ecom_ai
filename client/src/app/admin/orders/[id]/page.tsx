import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { OrderStatusControl } from "@/components/admin/order-status-control";
import { OrderDetails } from "@/components/order-details";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Order · Admin" };

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <div className="grid gap-6">
      <Link
        href="/admin/orders"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        All orders
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{order.orderNumber}</h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-muted-foreground text-sm">
          {formatDateTime(order.createdAt)}
        </span>
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
