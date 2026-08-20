"use client";

import { PencilIcon, PlusIcon } from "lucide-react";

import { createCategoryAction, updateCategoryAction } from "@/actions/catalogue";
import { FormDialog } from "@/components/data-table/form-dialog";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { ImageUploadField } from "@/components/form/image-upload-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { CATEGORY_TYPES, type Category } from "@/types/api";

/** Held to the API's enum, which is also a MySQL ENUM — a typo is a 400. */
const TYPE_OPTIONS = CATEGORY_TYPES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

function Fields({
  category,
  state,
}: {
  category?: Category;
  state: { message?: string; fields?: Record<string, string> } | null;
}) {
  return (
    <>
      <FormError message={state?.message} />
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field
        name="name"
        label="Name"
        defaultValue={category?.name}
        required
        error={state?.fields?.name}
      />
      <SelectField
        name="categoryType"
        label="Type"
        defaultValue={category?.categoryType ?? "featured"}
        options={TYPE_OPTIONS}
        error={state?.fields?.categoryType}
      />
      <ImageUploadField
        name="image"
        label="Image"
        folder="categories"
        defaultValue={category?.image ?? ""}
        error={state?.fields?.image}
      />
    </>
  );
}

export function CreateCategoryDialog() {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon />
          Add category
        </Button>
      }
      title="Add a category"
      action={createCategoryAction}
      submitLabel="Create category"
      successMessage="Category created"
    >
      {(state) => <Fields state={state} />}
    </FormDialog>
  );
}

export function EditCategoryDialog({ category }: { category: Category }) {
  return (
    <FormDialog
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Edit
        </Button>
      }
      title={`Edit ${category.name}`}
      action={updateCategoryAction}
      submitLabel="Save changes"
      successMessage="Category updated"
    >
      {(state) => <Fields category={category} state={state} />}
    </FormDialog>
  );
}
