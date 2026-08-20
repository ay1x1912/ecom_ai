import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, StarIcon } from "lucide-react";

import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { Price } from "@/components/shop/price";
import { ProductImage } from "@/components/shop/product-image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getProductBySlug } from "@/lib/catalogue";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return product
    ? { title: product.name, description: product.description ?? undefined }
    : { title: "Product not found" };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // getProductBySlug collapses the backend's 404 into null, so this is the only
  // place a missing product has to be handled.
  if (!product) notFound();

  return (
    <div className="grid gap-8">
      <Link
        href="/products"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        All products
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-lg border">
          <ProductImage
            src={product.image}
            alt={product.name}
            sizes="(min-width: 768px) 32rem, 100vw"
            priority
          />
        </div>

        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Badge variant="secondary">{product.category.name}</Badge>
              ) : null}
              {product.brand ? <Badge variant="outline">{product.brand.name}</Badge> : null}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>

            {product.ratingsCount > 0 ? (
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <StarIcon className="size-4 fill-amber-400 text-amber-400" />
                <span className="tabular-nums">{product.averageRating?.toFixed(1)}</span>
                <span>
                  ({product.ratingsCount} {product.ratingsCount === 1 ? "review" : "reviews"})
                </span>
              </p>
            ) : null}
          </div>

          <Price
            price={product.price}
            finalPrice={product.finalPrice}
            discountPercentage={product.discountPercentage}
            className="text-xl"
          />

          <p className="text-muted-foreground text-sm">
            {product.inStock ? (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-500">
                  In stock
                </span>{" "}
                — {product.stock} available
              </>
            ) : (
              <span className="text-destructive font-medium">Out of stock</span>
            )}
          </p>

          <AddToCartForm
            productId={product.id}
            disabled={!product.inStock}
            returnTo={`/products/${product.slug}`}
            selectable
            maxQuantity={product.stock}
            className="max-w-xs"
          />

          {product.description ? (
            <>
              <Separator className="my-2" />
              <div className="grid gap-2">
                <h2 className="text-sm font-medium">Description</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {product.description}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
