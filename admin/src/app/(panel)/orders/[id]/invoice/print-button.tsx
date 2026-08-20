"use client";

import { PrinterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** `window.print()` needs a client component; the invoice itself stays server-rendered. */
export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <PrinterIcon />
      Print / save as PDF
    </Button>
  );
}
