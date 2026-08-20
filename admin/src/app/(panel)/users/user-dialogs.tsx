"use client";

import { PencilIcon, PlusIcon } from "lucide-react";

import { createUserAction, updateUserAction } from "@/actions/users";
import { FormDialog } from "@/components/data-table/form-dialog";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { ASSIGNABLE_ROLES, type Role, type User } from "@/types/api";

/** Only the roles this panel hands out — `deliveryman` is not one of them. */
const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  label: role === "admin" ? "Admin" : "Customer",
}));

/**
 * A user whose role is not assignable still needs it kept on save, since the API
 * would otherwise take the form's value as an edit. Adding it to the options for
 * that one record preserves it without offering it to anyone else.
 */
const optionsFor = (role: Role) =>
  ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])
    ? ROLE_OPTIONS
    : [...ROLE_OPTIONS, { value: role, label: "Delivery (existing)" }];

export function CreateUserDialog() {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon />
          Add user
        </Button>
      }
      title="Add a user"
      description="This is the only place a role can be assigned — public sign-up cannot."
      action={createUserAction}
      submitLabel="Create user"
      successMessage="User created"
    >
      {(state) => (
        <>
          <FormError message={state?.message} />
          <Field name="name" label="Name" required error={state?.fields?.name} />
          <Field
            name="email"
            label="Email"
            type="email"
            required
            error={state?.fields?.email}
          />
          <Field
            name="password"
            label="Password"
            type="password"
            required
            hint="At least 8 characters."
            error={state?.fields?.password}
          />
          <SelectField
            name="role"
            label="Role"
            defaultValue="user"
            options={ROLE_OPTIONS}
            error={state?.fields?.role}
          />
        </>
      )}
    </FormDialog>
  );
}

export function EditUserDialog({ user }: { user: User }) {
  return (
    <FormDialog
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Edit
        </Button>
      }
      title={`Edit ${user.name}`}
      action={updateUserAction}
      submitLabel="Save changes"
      successMessage="User updated"
    >
      {(state) => (
        <>
          <FormError message={state?.message} />
          <input type="hidden" name="id" value={user.id} />
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
          <Field
            name="avatar"
            label="Avatar URL"
            type="url"
            defaultValue={user.avatar ?? ""}
            error={state?.fields?.avatar}
          />
          <SelectField
            name="role"
            label="Role"
            defaultValue={user.role}
            options={optionsFor(user.role)}
            error={state?.fields?.role}
          />
          <Field
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="Leave blank to keep the current password."
            error={state?.fields?.password}
          />
        </>
      )}
    </FormDialog>
  );
}
