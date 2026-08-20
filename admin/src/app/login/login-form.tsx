"use client";

import { useActionState } from "react";

import { loginAction } from "@/actions/auth";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="grid gap-4">
      <FormError message={state?.message} />

      {next ? <input type="hidden" name="next" value={next} /> : null}

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
        autoComplete="current-password"
        required
        error={state?.fields?.password}
      />

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
