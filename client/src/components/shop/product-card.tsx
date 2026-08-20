import Link from "next/link";

import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { ProductImage } from "@/components/shop/product-image";
import { Price } from "@/components/shop/price";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/types/api";

export function ProductCard({
  product,
  returnTo,
}: {
  product: Product;
  returnTo: string;
}) {
  // h-full plus a growing body keeps every card in a row the same height, so the
  // buttons line up however long the names run.
  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-square">
          <ProductImage
            src={product.image}
            alt={product.name}
            // Four columns on desktop, three on tablet, two on phones — tells the
            // optimiser which width to actually generate.
            sizes="(min-width: 1024px) 16rem, (min-width: 640px) 33vw, 50vw"
          />
          {!product.inStock ? (
            <Badge variant="destructive" className="absolute top-2 left-2">
              Out of stock
            </Badge>
          ) : null}
        </div>
      </Link>

      <CardContent className="grid flex-1 content-start gap-1.5 p-4">
        <Link href={`/products/${product.slug}`} className="hover:underline">
          <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        </Link>
        {product.brand ? (
          <p className="text-muted-foreground text-xs">{product.brand.name}</p>
        ) : null}
        <Price
          price={product.price}
          finalPrice={product.finalPrice}
          discountPercentage={product.discountPercentage}
        />
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <AddToCartForm
          productId={product.id}
          disabled={!product.inStock}
          returnTo={returnTo}
          size="sm"
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}
