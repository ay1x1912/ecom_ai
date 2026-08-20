"use client";

import { useEffect } from "react";
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Catches whatever a server component or action threw and did not handle —
 * usually the API being unreachable.
 *
 * The message itself is not shown: it comes from the server and can name
 * internals. `digest` is the safe handle for correlating with the server log.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        The panel could not load. If the API is not running on port 8000, that is
        the usual cause.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">ref: {error.digest}</p>
      ) : null}
      <Button onClick={reset}>
        <RefreshCwIcon />
        Try again
      </Button>
    </div>
  );
}
