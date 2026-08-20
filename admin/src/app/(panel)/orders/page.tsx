import type { Metadata } from "next";
import Link from "next/link";

import { EmptyRow } from "@/components/data-table/empty-row";
import { FilterSelect } from "@/components/data-table/filter-select";
import { SearchInput } from "@/components/data-table/search-input";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Pagination } from "@/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { flatten, one, oneOf, positiveInt } from "@/lib/list-params";
import { listOrders } from "@/lib/resources";
import { ORDER_STATUSES } from "@/types/api";

export const metadata: Metadata = { title: "Orders" };

const STATUS_FILTERS = ORDER_STATUSES.map((status) => ({
  value: status,
  label: status[0].toUpperCase() + status.slice(1),
}));

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const params = await searchParams;

  const { rows, meta } = await listOrders({
    page: positiveInt(params.page) ?? 1,
    // The API searches orders by order number only.
    search: one(params.search),
    status: oneOf(params.status, ORDER_STATUSES),
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm tabular-nums">{meta.total} total</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput basePath="/orders" placeholder="Search order number…" />
        <FilterSelect
          basePath="/orders"
          param="status"
          label="Status"
          allLabel="All statuses"
          options={STATUS_FILTERS}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No orders match this filter" />
            ) : (
              rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {/* Null once a customer deletes their account — the order
                        survives them, by design (FK ON DELETE SET NULL). */}
                    {order.customer?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">{order.items.length}</TableCell>
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

      <Pagination meta={meta} basePath="/orders" params={flatten(params)} />
    </div>
  );
}
