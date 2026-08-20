"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Loader2Icon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { removeCartItemAction, updateCartItemAction } from "@/actions/cart";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import type { CartItem } from "@/types/api";

/**
 * One cart line.
 *
 * The quantity buttons carry their target value as the submit button's own
 * name/value pair, which lands in the FormData — so there is no local quantity
 * state to keep in sync with the server, and no way for the two to disagree.
 */
export function CartLine({ item }: { item: CartItem }) {
  const [updateState, updateAction, updating] = useActionState(updateCartItemAction, null);
  const [removeState, removeAction, removing] = useActionState(removeCartItemAction, null);

  useEffect(() => {
    const failed = [updateState, removeState].find((state) => state && !state.ok);
    if (failed?.message) toast.error(failed.message);
  }, [updateState, removeState]);

  const product = item.product;
  const busy = updating || removing;

  return (
    <li className="flex gap-4 py-4">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-md border">
        {product ? (
          <ProductImage src={product.image} alt={product.name} sizes="5rem" />
        ) : null}
      </div>

      <div className="grid flex-1 gap-1">
        {product ? (
          <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:underline">
            {product.name}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">Product no longer available</span>
        )}

        <span className="text-muted-foreground text-xs tabular-nums">
          {formatMoney(item.unitPrice)} each
        </span>

        {!item.inStock ? (
          <span className="text-destructive text-xs">
            Only {item.availableStock} left — reduce the quantity to check out.
          </span>
        ) : null}

        <div className="mt-1 flex items-center gap-3">
          <form action={updateAction} className="flex items-center gap-1">
            <input type="hidden" name="productId" value={item.productId} />
            <Button
              type="submit"
              name="quantity"
              value={item.quantity - 1}
              variant="outline"
              size="icon"
              className="size-7"
              disabled={busy}
              aria-label="Decrease quantity"
            >
              <MinusIcon />
            </Button>

            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {updating ? <Loader2Icon className="mx-auto size-3.5 animate-spin" /> : item.quantity}
            </span>

            <Button
              type="submit"
              name="quantity"
              value={item.quantity + 1}
              variant="outline"
              size="icon"
              className="size-7"
              disabled={busy || (product ? item.quantity >= product.stock : true)}
              aria-label="Increase quantity"
            >
              <PlusIcon />
            </Button>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="productId" value={item.productId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-7 px-2"
              disabled={busy}
            >
              <Trash2Icon />
              Remove
            </Button>
          </form>
        </div>
      </div>

      <div className="text-sm font-medium tabular-nums">{formatMoney(item.lineTotal)}</div>
    </li>
  );
}
