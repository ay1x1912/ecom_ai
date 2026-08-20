"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { payOrderAction } from "@/actions/checkout";
import { cancelOrderAction } from "@/actions/orders";
import { SubmitButton } from "@/components/form/submit-button";
import type { OrderStatus } from "@/types/api";

/**
 * What the customer can still do to this order.
 *
 * Only pending orders offer anything: paying is refused by the backend for any
 * other status, and cancelling is owner-allowed only from pending. Rendering
 * nothing elsewhere keeps the UI honest about what will actually work.
 */
export function OrderActions({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [payState, payAction] = useActionState(payOrderAction, null);
  const [cancelState, cancelAction] = useActionState(cancelOrderAction, null);

  useEffect(() => {
    const failed = [payState, cancelState].find((state) => state?.message);
    if (failed?.message) toast.error(failed.message);
  }, [payState, cancelState]);

  if (status !== "pending") return null;

  return (
    <div className="flex items-center gap-2">
      <form action={cancelAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <SubmitButton variant="outline" pendingLabel="Cancelling…">
          Cancel order
        </SubmitButton>
      </form>

      <form action={payAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <SubmitButton pendingLabel="Opening payment…">Pay now</SubmitButton>
      </form>
    </div>
  );
}
