"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import type { FormState } from "@/actions/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A dialog wrapping one server action, used by every create and edit form.
 *
 * It calls the action directly inside a transition rather than through
 * `useActionState`, because a dialog needs to *do* something on success — close
 * itself and toast. With `useActionState` that reaction has to live in an effect
 * watching the returned state, which is both a lint error under the React
 * Compiler rules and fragile: the parent re-renders on `refresh()`, and the
 * effect can be torn down before it fires. Handling it in the submit callback is
 * simpler and exact.
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Save",
  successMessage,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  successMessage: string;
  /** Rendered inside the form; receives the last failure so fields can show it. */
  children: (state: FormState) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Clear stale validation errors so reopening starts clean.
        if (!next) setState(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await action(null, formData);
              setState(result);

              if (result && !result.message) {
                toast.success(successMessage);
                setOpen(false);
              }
            });
          }}
          className="grid gap-4"
        >
          {children(state)}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
