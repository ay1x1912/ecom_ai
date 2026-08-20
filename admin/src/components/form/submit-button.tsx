"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button that disables itself while its form is in flight.
 *
 * `useFormStatus` reads the state of the nearest enclosing <form>, which is why
 * this has to be its own component rather than a prop on the page.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      // `disabled` is pulled out of props on purpose: spreading it after this
      // would let an explicit `undefined` from the caller cancel the pending lock.
      disabled={pending || disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2Icon className="animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
