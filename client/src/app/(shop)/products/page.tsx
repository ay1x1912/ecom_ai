import type { Metadata } from "next";

import { Pagination } from "@/components/shop/pagination";
import { ProductCard } from "@/components/shop/product-card";
import { ProductFilters } from "@/components/shop/product-filters";
import { listCategories, listProducts, type ProductListParams } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Products" };

const PER_PAGE = 12;

/** First value only: ?categoryId=1&categoryId=2 is a malformed URL, not a feature. */
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const num = (value: string | string[] | undefined) => {
  const parsed = Number(one(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;

  const query: ProductListParams = {
    page: num(params.page) ?? 1,
    perPage: PER_PAGE,
    search: one(params.search),
    sortBy: one(params.sortBy) as ProductListParams["sortBy"],
    sortOrder: one(params.sortOrder) as ProductListParams["sortOrder"],
    categoryId: num(params.categoryId),
    brandId: num(params.brandId),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    inStock: one(params.inStock) === "true" ? true : undefined,
  };

  const [{ products, meta }, categories] = await Promise.all([
    listProducts(query),
    listCategories(),
  ]);

  // Where add-to-cart should return to if the visitor has to sign in first.
  const search = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => {
      const single = one(value);
      return single ? [[key, single] as [string, string]] : [];
    }),
  ).toString();
  const returnTo = search ? `/products?${search}` : "/products";

  const term = one(params.search);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {term ? `Results for “${term}”` : "All products"}
        </h1>
        <p className="text-muted-foreground text-sm tabular-nums">
          {meta.total} {meta.total === 1 ? "product" : "products"}
        </p>
      </div>

      <ProductFilters categories={categories} />

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">No products match those filters.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Try clearing the search or widening the category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} returnTo={returnTo} />
          ))}
        </div>
      )}

      <Pagination
        meta={meta}
        basePath="/products"
        params={Object.fromEntries(
          Object.entries(params).map(([key, value]) => [key, one(value)]),
        )}
      />
    </div>
  );
}
