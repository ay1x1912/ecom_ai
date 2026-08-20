import "server-only";

import { apiData, apiMaybe, apiRequest } from "@/lib/api";
import type { Brand, Category, PaginationMeta, Product } from "@/types/api";

/** Mirrors productQuerySchema on the backend. Anything not listed is rejected there. */
export type ProductListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: "createdAt" | "name" | "price" | "averageRating";
  sortOrder?: "asc" | "desc";
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

export async function listProducts(
  params: ProductListParams = {},
): Promise<{ products: Product[]; meta: PaginationMeta }> {
  const { data, meta } = await apiRequest<Product[]>("/api/products", { query: params });

  return {
    products: data,
    // The backend always sends meta on a list; the fallback keeps the type honest
    // rather than forcing every caller to null-check pagination.
    meta: meta ?? { page: 1, perPage: data.length, total: data.length, totalPages: 1 },
  };
}

export const getProductBySlug = (slug: string) =>
  apiMaybe<Product>(`/api/products/slug/${encodeURIComponent(slug)}`);

export const getProductById = (id: number | string) =>
  apiMaybe<Product>(`/api/products/${id}`);

/**
 * Category and brand lists for filter and admin selects.
 *
 * perPage is pinned at the backend's maximum: these are small reference tables and
 * a paginated <select> would be a worse answer than one request.
 */
export const listCategories = () =>
  apiData<Category[]>("/api/categories", { query: { perPage: 100, sortBy: "name" } });

export const listBrands = () =>
  apiData<Brand[]>("/api/brands", { query: { perPage: 100, sortBy: "name" } });
