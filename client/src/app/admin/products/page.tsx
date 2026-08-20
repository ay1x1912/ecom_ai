import type { Metadata } from "next";
import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { ProductSearch } from "@/components/admin/product-search";
import { Pagination } from "@/components/shop/pagination";
import { ProductImage } from "@/components/shop/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts } from "@/lib/catalogue";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Products · Admin" };

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const params = await searchParams;
  const search = one(params.search);

  const { products, meta } = await listProducts({
    page: Number(one(params.page)) || 1,
    perPage: 20,
    search,
    sortBy: "name",
    sortOrder: "asc",
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground text-sm tabular-nums">{meta.total} total</p>
      </div>

      <ProductSearch />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                  No products match that search.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="bg-muted relative size-10 overflow-hidden rounded border">
                      <ProductImage src={product.image} alt="" sizes="2.5rem" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.discountPercentage > 0 ? (
                      <Badge variant="secondary" className="ml-2">
                        -{product.discountPercentage}%
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(product.finalPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock === 0 ? (
                      <span className="text-destructive">0</span>
                    ) : (
                      product.stock
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/products/${product.id}`}>
                        <PencilIcon />
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/admin/products" params={{ search }} />
    </div>
  );
}
