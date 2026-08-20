"use client";

import { PencilIcon, PlusIcon } from "lucide-react";

import { createBrandAction, updateBrandAction } from "@/actions/catalogue";
import { FormDialog } from "@/components/data-table/form-dialog";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { ImageUploadField } from "@/components/form/image-upload-field";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/actions/types";
import type { Brand } from "@/types/api";

function Fields({ brand, state }: { brand?: Brand; state: FormState }) {
  return (
    <>
      <FormError message={state?.message} />
      {brand ? <input type="hidden" name="id" value={brand.id} /> : null}
      <Field
        name="name"
        label="Name"
        defaultValue={brand?.name}
        required
        error={state?.fields?.name}
      />
      <ImageUploadField
        name="image"
        label="Logo"
        folder="brands"
        defaultValue={brand?.image ?? ""}
        error={state?.fields?.image}
      />
    </>
  );
}

export function CreateBrandDialog() {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon />
          Add brand
        </Button>
      }
      title="Add a brand"
      action={createBrandAction}
      submitLabel="Create brand"
      successMessage="Brand created"
    >
      {(state) => <Fields state={state} />}
    </FormDialog>
  );
}

export function EditBrandDialog({ brand }: { brand: Brand }) {
  return (
    <FormDialog
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Edit
        </Button>
      }
      title={`Edit ${brand.name}`}
      action={updateBrandAction}
      submitLabel="Save changes"
      successMessage="Brand updated"
    >
      {(state) => <Fields brand={brand} state={state} />}
    </FormDialog>
  );
}
