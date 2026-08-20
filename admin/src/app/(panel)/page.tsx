import type { Metadata } from "next";
import Link from "next/link";
import {
  DollarSignIcon,
  PackageIcon,
  ShoppingBagIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";

import { OrdersByStatusChart } from "@/components/charts/orders-by-status-chart";
import { ProductsByCategoryChart } from "@/components/charts/products-by-category-chart";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { StatCard } from "@/components/panel/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getStats } from "@/lib/resources";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * The whole dashboard from a single GET /api/stats.
 *
 * Every figure below is aggregated in SQL by the API — nothing here loads rows to
 * count them, and nothing recomputes a total in JavaScript. The course reaches the
 * same screen by fetching in `useEffect` and assembling state; a server component
 * awaits it and hands plain data to the two chart components, which are the only
 * client components on the page.
 */
export default async function DashboardPage() {
  const stats = await getStats(5, 5);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Revenue counts paid and completed orders only — pending is a forecast,
          not income.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatMoney(stats.revenue.earned)}
          hint={`${formatMoney(stats.revenue.averageOrderValue)} average order`}
          icon={DollarSignIcon}
        />
        <StatCard
          label="Orders"
          value={stats.totals.orders}
          hint={`${formatMoney(stats.revenue.pending)} still pending`}
          icon={ShoppingBagIcon}
        />
        <StatCard
          label="Products"
          value={stats.totals.products}
          hint={`${stats.products.unitsOnHand} units on hand`}
          icon={PackageIcon}
        />
        <StatCard label="Users" value={stats.totals.users} icon={UsersIcon} />
      </div>

      {stats.products.outOfStock > 0 || stats.products.lowStock > 0 ? (
        <Card className="border-amber-300 dark:border-amber-900">
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <TriangleAlertIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <span>
              <strong className="tabular-nums">{stats.products.outOfStock}</strong> out
              of stock,{" "}
              <strong className="tabular-nums">{stats.products.lowStock}</strong> low
              (5 or fewer).
            </span>
            <Link
              href="/products"
              className="text-muted-foreground hover:text-foreground ml-auto underline-offset-4 hover:underline"
            >
              Review products
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by status</CardTitle>
            <CardDescription>Count per status, value in the tooltip.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersByStatusChart data={stats.orders.byStatus} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products by category</CardTitle>
            <CardDescription>Where the catalogue is concentrated.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductsByCategoryChart data={stats.products.byCategory} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best sellers</CardTitle>
            <CardDescription>
              Units from paid and completed orders. Counted off order snapshots, so
              a deleted product keeps the sales it made.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Product</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="pr-6 text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.products.bestSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                      Nothing has sold yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.products.bestSellers.map((row) => (
                    <TableRow key={`${row.productId}-${row.name}`}>
                      <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.unitsSold}
                      </TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {formatMoney(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not moving</CardTitle>
            <CardDescription>
              Never appeared in a paid order — capital sitting on a shelf.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="pr-6 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.products.neverSold.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                      Everything has sold at least once.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.products.neverSold.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-6 font-medium">{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.stock}</TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        {formatMoney(row.price)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.orders.recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    No orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                stats.orders.recent.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-6">
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.customer?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">
                      {formatMoney(order.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
