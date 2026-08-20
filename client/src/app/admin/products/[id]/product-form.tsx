"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { updateProductAction } from "@/actions/admin";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SelectField } from "@/components/form/select-field";
import { SubmitButton } from "@/components/form/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canOptimise } from "@/lib/image-hosts";
import type { Brand, Category, Product } from "@/types/api";

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product: Product;
  categories: Category[];
  brands: Brand[];
}) {
  const [state, formAction] = useActionState(updateProductAction, null);
  const [image, setImage] = useState(product.image);

  useEffect(() => {
    if (state && !state.message) toast.success("Product saved");
  }, [state]);

  return (
    <form action={formAction} className="grid gap-5">
      <FormError message={state?.message} />

      <input type="hidden" name="id" value={product.id} />

      <Field name="name" label="Name" defaultValue={product.name} required error={state?.fields?.name} />

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product.description ?? ""}
        />
        {state?.fields?.description ? (
          <p className="text-destructive text-xs">{state.fields.description}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="price"
          label="Price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product.price}
          required
          error={state?.fields?.price}
        />
        <Field
          name="discountPercentage"
          label="Discount %"
          type="number"
          min="0"
          // The DB has a CHECK constraint at 90: 100% would mean free.
          max="90"
          defaultValue={product.discountPercentage}
          error={state?.fields?.discountPercentage}
        />
        <Field
          name="stock"
          label="Stock"
          type="number"
          min="0"
          defaultValue={product.stock}
          required
          error={state?.fields?.stock}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="categoryId"
          label="Category"
          defaultValue={product.category ? String(product.category.id) : ""}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          error={state?.fields?.categoryId}
        />
        <SelectField
          name="brandId"
          label="Brand"
          defaultValue={product.brand ? String(product.brand.id) : ""}
          options={brands.map((b) => ({ value: String(b.id), label: b.name }))}
          error={state?.fields?.brandId}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field
          name="image"
          label="Image URL"
          type="url"
          value={image}
          onChange={(event) => setImage(event.target.value)}
          required
          hint={
            canOptimise(image)
              ? "Known host — this one goes through the image optimiser."
              : "Unknown host: it will still render, just unoptimised."
          }
          error={state?.fields?.image}
        />
        <div className="bg-muted size-20 overflow-hidden rounded-md border">
          {/* Deliberately a plain <img>: the URL is being typed, so it is invalid
              for most of the time this is on screen. */}
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : null}
        </div>
      </div>

      <SubmitButton className="w-fit" pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
