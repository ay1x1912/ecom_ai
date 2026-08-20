import type { Metadata } from "next";
import Link from "next/link";

import { OrderFilters } from "@/components/admin/order-filters";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Pagination } from "@/components/shop/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { listAllOrders } from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/types/api";

export const metadata: Metadata = { title: "Orders · Admin" };

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const statusParam = one(params.status);

  const { orders, meta } = await listAllOrders({
    page: Number(one(params.page)) || 1,
    perPage: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    // Anything not in the enum is dropped rather than sent — the backend would
    // reject it with a 400 and take the whole page down with it.
    status: ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined,
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm tabular-nums">{meta.total} total</p>
      </div>

      <OrderFilters />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  No orders match this filter.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {/* Null once a customer deletes their account — the order
                        survives them, by design. */}
                    {order.customer?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(order.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        meta={meta}
        basePath="/admin/orders"
        params={{ status: statusParam }}
      />
    </div>
  );
}
