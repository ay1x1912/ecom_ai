"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateOrderStatusAction } from "@/actions/admin";
import { SubmitButton } from "@/components/form/submit-button";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/types/api";

/**
 * One button per legal next status.
 *
 * The target rides in the submit button's own name/value pair, so there is no
 * select, no hidden input and no local state to reconcile — and only the moves
 * the backend will actually accept are offered. Illegal transitions come back
 * as a 409 naming both states; these buttons make that unreachable from the UI.
 */
const ACTIONS: Record<OrderStatus, { label: string; variant: "default" | "outline" }> = {
  pending: { label: "Mark as pending", variant: "outline" },
  paid: { label: "Mark as paid", variant: "default" },
  completed: { label: "Mark as completed", variant: "default" },
  cancelled: { label: "Cancel order", variant: "outline" },
};

const FINAL_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [state, formAction] = useActionState(updateOrderStatusAction, null);
  const allowed = ORDER_TRANSITIONS[status];

  useEffect(() => {
    if (!state) return;
    if (state.message) toast.error(state.message);
    else toast.success("Status updated");
  }, [state]);

  if (allowed.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {FINAL_LABEL[status]} is a final status — there is nothing left to change.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />

      {allowed.map((option) => (
        <SubmitButton
          key={option}
          name="status"
          value={option}
          variant={ACTIONS[option].variant}
          pendingLabel="Updating…"
        >
          {ACTIONS[option].label}
        </SubmitButton>
      ))}
    </form>
  );
}
