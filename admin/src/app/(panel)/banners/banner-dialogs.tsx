"use client";

import { PencilIcon, PlusIcon } from "lucide-react";

import { createBannerAction, updateBannerAction } from "@/actions/catalogue";
import { FormDialog } from "@/components/data-table/form-dialog";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { ImageUploadField } from "@/components/form/image-upload-field";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/actions/types";
import type { Banner } from "@/types/api";

function Fields({ banner, state }: { banner?: Banner; state: FormState }) {
  return (
    <>
      <FormError message={state?.message} />
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <Field
        name="name"
        label="Name"
        defaultValue={banner?.name}
        required
        hint="Internal label — how you will recognise this slot."
        error={state?.fields?.name}
      />
      <Field
        name="title"
        label="Headline"
        defaultValue={banner?.title ?? ""}
        error={state?.fields?.title}
      />
      <Field
        name="startFrom"
        label="Price label"
        defaultValue={banner?.startFrom ?? ""}
        // Free text on the API despite the name — it is a caption, not a date.
        hint="Free text, e.g. “From $9.99”."
        error={state?.fields?.startFrom}
      />
      <Field
        name="bannerType"
        label="Slot"
        defaultValue={banner?.bannerType ?? ""}
        hint="Where the storefront should place it, e.g. “hero”."
        error={state?.fields?.bannerType}
      />
      <ImageUploadField
        name="image"
        label="Image"
        folder="banners"
        defaultValue={banner?.image ?? ""}
        error={state?.fields?.image}
      />
    </>
  );
}

export function CreateBannerDialog() {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon />
          Add banner
        </Button>
      }
      title="Add a banner"
      action={createBannerAction}
      submitLabel="Create banner"
      successMessage="Banner created"
    >
      {(state) => <Fields state={state} />}
    </FormDialog>
  );
}

export function EditBannerDialog({ banner }: { banner: Banner }) {
  return (
    <FormDialog
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Edit
        </Button>
      }
      title={`Edit ${banner.name}`}
      action={updateBannerAction}
      submitLabel="Save changes"
      successMessage="Banner updated"
    >
      {(state) => <Fields banner={banner} state={state} />}
    </FormDialog>
  );
}
