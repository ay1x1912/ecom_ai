"use client";

import { useActionState } from "react";
import { CheckIcon, XIcon } from "lucide-react";

import { settleMockPaymentAction } from "@/actions/payment";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";

export function MockCheckoutForm({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useActionState(settleMockPaymentAction, null);

  return (
    <form action={formAction} className="grid gap-3">
      <FormError message={state?.message} />

      <input type="hidden" name="sessionId" value={sessionId} />

      {/* The chosen outcome rides along as the submit button's own value. */}
      <SubmitButton name="outcome" value="success" size="lg" disabled={!sessionId}>
        <CheckIcon />
        Pay now
      </SubmitButton>

      <SubmitButton
        name="outcome"
        value="failure"
        variant="outline"
        disabled={!sessionId}
      >
        <XIcon />
        Simulate a failed payment
      </SubmitButton>
    </form>
  );
}
