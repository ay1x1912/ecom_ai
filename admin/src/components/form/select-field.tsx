"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A Radix Select that a plain <form> can actually submit.
 *
 * Radix renders a button and a portal, not a native <select>, so nothing would
 * appear in the FormData without the hidden input this keeps in step.
 */
export function SelectField({
  name,
  label,
  options,
  defaultValue,
  error,
  placeholder,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  error?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${name}-trigger`}>{label}</Label>
      <input type="hidden" name={name} value={value} />

      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={`${name}-trigger`} aria-invalid={error ? true : undefined}>
          <SelectValue placeholder={placeholder ?? "Choose one"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
