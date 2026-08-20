import type { Metadata } from "next";
import Link from "next/link";
import { PackageIcon } from "lucide-react";

import { OrderStatusBadge } from "@/components/order-status-badge";
import { Pagination } from "@/components/shop/pagination";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { listMyOrders } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  await requireUser("/orders");

  const params = await searchParams;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;

  const { orders, meta } = await listMyOrders({
    page,
    perPage: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (orders.length === 0) {
    return (
      <div className="grid place-items-center gap-4 rounded-lg border border-dashed py-20 text-center">
        <PackageIcon className="text-muted-foreground size-8" />
        <div className="grid gap-1">
          <p className="font-medium">No orders yet</p>
          <p className="text-muted-foreground text-sm">
            Anything you buy will show up here.
          </p>
        </div>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(order.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/orders" params={{}} />
    </div>
  );
}
