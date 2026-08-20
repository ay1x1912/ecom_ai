"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { addAddressAction } from "@/actions/checkout";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { Label } from "@/components/ui/label";

export function AddressForm({ isFirst }: { isFirst: boolean }) {
  const [state, formAction] = useActionState(addAddressAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // A state object with no message means the address saved. Clear the inputs so
    // the form is ready for another one instead of re-showing what was just added.
    if (state && !state.message) {
      ref.current?.reset();
      toast.success("Address saved");
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="grid gap-4">
      <FormError message={state?.message} />

      <Field name="street" label="Street" autoComplete="address-line1" required error={state?.fields?.street} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label="City" autoComplete="address-level2" required error={state?.fields?.city} />
        <Field
          name="postalCode"
          label="Postal code"
          autoComplete="postal-code"
          required
          error={state?.fields?.postalCode}
        />
      </div>
      <Field name="country" label="Country" autoComplete="country-name" required error={state?.fields?.country} />
      <Field
        name="note"
        label="Delivery note"
        placeholder="Leave with the neighbour, etc."
        error={state?.fields?.note}
      />

      <div className="flex items-center gap-2">
        <input
          id="isDefault"
          name="isDefault"
          type="checkbox"
          defaultChecked={isFirst}
          className="border-input accent-primary size-4 rounded border"
        />
        <Label htmlFor="isDefault" className="text-sm font-normal">
          Make this my default address
        </Label>
      </div>

      <SubmitButton variant="outline" pendingLabel="Saving…">
        Save address
      </SubmitButton>
    </form>
  );
}
