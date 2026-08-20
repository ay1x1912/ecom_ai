import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import {
  CreateProductDialog,
  EditProductDialog,
} from "@/app/(panel)/products/product-dialogs";
import { deleteProductAction } from "@/actions/products";
import { DeleteButton } from "@/components/data-table/delete-button";
import { EmptyRow } from "@/components/data-table/empty-row";
import { FilterSelect } from "@/components/data-table/filter-select";
import { SearchInput } from "@/components/data-table/search-input";
import { Pagination } from "@/components/pagination";
import { ProductImage } from "@/components/product-image";
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
import { formatMoney } from "@/lib/format";
import { flatten, one, positiveInt } from "@/lib/list-params";
import { allBrands, allCategories, listProducts } from "@/lib/resources";

export const metadata: Metadata = { title: "Products" };

const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "http://localhost:3000";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;

  // Categories and brands serve double duty: the filter selects here and the two
  // required foreign keys on the create/edit form.
  const [{ rows, meta }, categories, brands] = await Promise.all([
    listProducts({
      page: positiveInt(params.page) ?? 1,
      search: one(params.search),
      categoryId: positiveInt(params.categoryId),
      brandId: positiveInt(params.brandId),
      sortBy: "name",
      sortOrder: "asc",
    }),
    allCategories(),
    allBrands(),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            {meta.total} total
          </p>
        </div>
        <CreateProductDialog categories={categories} brands={brands} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput basePath="/products" placeholder="Search products…" />
        <FilterSelect
          basePath="/products"
          param="categoryId"
          label="Category"
          allLabel="All categories"
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <FilterSelect
          basePath="/products"
          param="brandId"
          label="Brand"
          allLabel="All brands"
          options={brands.map((b) => ({ value: String(b.id), label: b.name }))}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={7}
                message="No products match those filters"
                hint="Try clearing the search or widening the category."
              />
            ) : (
              rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="bg-muted relative size-10 overflow-hidden rounded border">
                      <ProductImage src={product.image} alt="" sizes="2.5rem" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{product.name}</span>
                    {product.discountPercentage > 0 ? (
                      <Badge variant="secondary" className="ml-2">
                        -{product.discountPercentage}%
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.brand?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(product.finalPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.stock === 0 ? (
                      <span className="text-destructive">0</span>
                    ) : product.stock <= 5 ? (
                      <span className="text-amber-600 dark:text-amber-500">
                        {product.stock}
                      </span>
                    ) : (
                      product.stock
                    )}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        href={`${STOREFRONT_URL}/products/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${product.name} on the storefront`}
                      >
                        <ExternalLinkIcon />
                      </Link>
                    </Button>
                    <EditProductDialog
                      product={product}
                      categories={categories}
                      brands={brands}
                    />
                    <DeleteButton
                      id={product.id}
                      label={product.name}
                      description="Past orders keep their own snapshot of this product, so history is not affected."
                      action={deleteProductAction}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/products" params={flatten(params)} />
    </div>
  );
}
