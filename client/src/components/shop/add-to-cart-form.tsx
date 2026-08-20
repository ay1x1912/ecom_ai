"use client";

import { useActionState, useEffect } from "react";
import { ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";

import { addToCartAction } from "@/actions/cart";
import { SubmitButton } from "@/components/form/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AddToCartForm({
  productId,
  disabled,
  label = "Add to cart",
  returnTo,
  className,
  size,
  /** Show a quantity box. Off on cards, on for the detail page. */
  selectable = false,
  maxQuantity = 100,
}: {
  productId: number;
  disabled?: boolean;
  label?: string;
  /** Where to come back to if the visitor has to sign in first. */
  returnTo: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  selectable?: boolean;
  maxQuantity?: number;
}) {
  const [state, formAction] = useActionState(addToCartAction, null);

  useEffect(() => {
    if (!state) return;
    // Stock conflicts surface here with the backend's own wording, e.g.
    // "Only 3 of X available (cart would have 5)".
    if (state.ok) toast.success(state.message ?? "Added to cart");
    else toast.error(state.message ?? "Could not add to cart");
  }, [state]);

  return (
    <form action={formAction} className={cn("grid gap-3", className)}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="next" value={returnTo} />

      {selectable ? (
        <div className="flex items-center gap-3">
          <Label htmlFor={`qty-${productId}`} className="text-sm">
            Quantity
          </Label>
          <Input
            id={`qty-${productId}`}
            name="quantity"
            type="number"
            min={1}
            // The backend caps a single add at 100 and refuses more than stock.
            max={Math.min(maxQuantity, 100)}
            defaultValue={1}
            disabled={disabled}
            className="w-20"
          />
        </div>
      ) : (
        <input type="hidden" name="quantity" value={1} />
      )}

      <SubmitButton size={size} disabled={disabled} pendingLabel="Adding…">
        <ShoppingCartIcon />
        {disabled ? "Out of stock" : label}
      </SubmitButton>
    </form>
  );
}
