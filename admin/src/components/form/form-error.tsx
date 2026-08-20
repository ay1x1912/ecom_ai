import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** The form-level message from a failed action — "Invalid credentials" and friends. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{message}</AlertTitle>
      <AlertDescription className="sr-only">
        Correct the highlighted fields and try again.
      </AlertDescription>
    </Alert>
  );
}
