"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";

import { updateAccountAction } from "@/actions/account";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { ImageUploadField } from "@/components/form/image-upload-field";
import { SubmitButton } from "@/components/form/submit-button";
import type { User } from "@/types/api";

export function AccountForm({ user }: { user: User }) {
  const [state, formAction] = useActionState(updateAccountAction, null);

  useEffect(() => {
    // A page-level form, so `useActionState` is the right fit here — unlike the
    // dialogs, nothing has to close or unmount on success.
    if (state && !state.message) toast.success("Account updated");
  }, [state]);

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <FormError message={state?.message} />

      <Field
        name="name"
        label="Name"
        defaultValue={user.name}
        required
        error={state?.fields?.name}
      />
      <Field
        name="email"
        label="Email"
        type="email"
        defaultValue={user.email}
        required
        error={state?.fields?.email}
      />
      <ImageUploadField
        name="avatar"
        label="Avatar"
        folder="avatars"
        defaultValue={user.avatar ?? ""}
        error={state?.fields?.avatar}
      />
      <Field
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="Leave blank to keep the current password."
        error={state?.fields?.password}
      />

      <SubmitButton className="w-fit" pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
