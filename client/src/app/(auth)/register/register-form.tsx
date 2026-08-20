"use client";

import { useActionState } from "react";

import { registerAction } from "@/actions/auth";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { Separator } from "@/components/ui/separator";

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(registerAction, null);

  return (
    <form action={formAction} className="grid gap-4">
      <FormError message={state?.message} />

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        name="name"
        label="Name"
        autoComplete="name"
        required
        error={state?.fields?.name}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={state?.fields?.email}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        error={state?.fields?.password}
      />

      <div className="grid gap-2">
        <Separator className="my-2" />
        <p className="text-muted-foreground text-xs">
          Shipping address — optional now, required before you can place an order.
          You can also add one at checkout.
        </p>
      </div>

      <Field name="street" label="Street" autoComplete="address-line1" error={state?.fields?.street} />
      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label="City" autoComplete="address-level2" error={state?.fields?.city} />
        <Field
          name="postalCode"
          label="Postal code"
          autoComplete="postal-code"
          error={state?.fields?.postalCode}
        />
      </div>
      <Field name="country" label="Country" autoComplete="country-name" error={state?.fields?.country} />

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
