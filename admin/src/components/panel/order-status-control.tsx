"use client";

import { useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { updateOrderStatusAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/types/api";

/**
 * One button per legal next status.
 *
 * Not a select-then-submit: offering only the moves the API will accept makes an
 * illegal transition unreachable from the UI rather than merely rejected. The
 * transition table is mirrored from the Order model.
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
  const [pending, startTransition] = useTransition();
  const allowed = ORDER_TRANSITIONS[status];

  if (allowed.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {FINAL_LABEL[status]} is a final status — there is nothing left to change.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowed.map((option) => (
        <Button
          key={option}
          variant={ACTIONS[option].variant}
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("orderId", String(orderId));
              formData.set("status", option);

              const result = await updateOrderStatusAction(null, formData);
              if (result?.message) toast.error(result.message);
              else toast.success(`Order marked ${option}`);
            });
          }}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {ACTIONS[option].label}
        </Button>
      ))}

      {status === "cancelled" ? null : (
        <p className="text-muted-foreground w-full text-xs">
          Cancelling returns the reserved stock.
        </p>
      )}
    </div>
  );
}
