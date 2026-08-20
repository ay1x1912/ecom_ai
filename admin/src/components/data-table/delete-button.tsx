"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import type { FormState } from "@/actions/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Delete behind a confirmation.
 *
 * A failure here is usually a foreign key — deleting a category that products
 * still reference — and the API returns a readable 409 for exactly that, so the
 * message is shown as a toast rather than swallowed.
 */
export function DeleteButton({
  id,
  label,
  description,
  action,
}: {
  id: number;
  /** The thing being deleted, for the confirmation copy. */
  label: string;
  description?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
          <span className="sr-only">Delete {label}</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{label}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Keep the dialog open until the server answers, so a rejection can
              // be shown against the thing it refers to.
              event.preventDefault();

              startTransition(async () => {
                const formData = new FormData();
                formData.set("id", String(id));
                const result = await action(null, formData);

                if (result?.message) {
                  toast.error(result.message);
                } else {
                  toast.success(`${label} deleted`);
                  setOpen(false);
                }
              });
            }}
          >
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
