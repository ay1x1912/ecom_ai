import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, ExternalLinkIcon } from "lucide-react";

import { ProductForm } from "@/app/admin/products/[id]/product-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductById, listBrands, listCategories } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Edit product · Admin" };

export default async function AdminProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;

  // Categories and brands are needed for the two selects — productUpdateSchema
  // takes them as foreign keys, not names.
  const [product, categories, brands] = await Promise.all([
    getProductById(id),
    listCategories(),
    listBrands(),
  ]);

  if (!product) notFound();

  return (
    <div className="grid max-w-3xl gap-6">
      <Link
        href="/admin/products"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        All products
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/products/${product.slug}`} target="_blank">
            View on storefront
            <ExternalLinkIcon />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product={product} categories={categories} brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
