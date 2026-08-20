"use client";

import { useActionState } from "react";

import { placeOrderAction } from "@/actions/checkout";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Address } from "@/types/api";

export function CheckoutForm({
  addresses,
  total,
}: {
  addresses: Address[];
  total: number;
}) {
  const [state, formAction] = useActionState(placeOrderAction, null);

  const preselected =
    addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id;

  return (
    <form action={formAction} className="grid gap-4">
      <FormError message={state?.message} />

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Ship to</legend>

        {addresses.map((address) => (
          <label
            key={address.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
              "has-[:checked]:border-primary has-[:checked]:bg-accent/40",
            )}
          >
            <input
              type="radio"
              name="addressId"
              value={address.id}
              defaultChecked={address.id === preselected}
              className="accent-primary mt-0.5 size-4"
              required
            />
            <span className="grid gap-0.5">
              <span className="font-medium">{address.street}</span>
              <span className="text-muted-foreground">
                {address.city}, {address.postalCode}, {address.country}
              </span>
              {address.note ? (
                <span className="text-muted-foreground text-xs">{address.note}</span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>

      <SubmitButton className="w-full" size="lg" pendingLabel="Placing order…">
        Pay {formatMoney(total)}
      </SubmitButton>

      <p className="text-muted-foreground text-xs">
        The order is priced by the server from your cart. You will be taken to the
        payment page next.
      </p>
    </form>
  );
}
