"use client";

import { PencilIcon, PlusIcon } from "lucide-react";

import { createProductAction, updateProductAction } from "@/actions/products";
import { FormDialog } from "@/components/data-table/form-dialog";
import { Field } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { ImageUploadField } from "@/components/form/image-upload-field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/actions/types";
import type { Brand, Category, Product } from "@/types/api";

function Fields({
  product,
  categories,
  brands,
  state,
}: {
  product?: Product;
  categories: Category[];
  brands: Brand[];
  state: FormState;
}) {
  return (
    <>
      <FormError message={state?.message} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <Field
        name="name"
        label="Name"
        defaultValue={product?.name}
        required
        error={state?.fields?.name}
      />

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
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
          defaultValue={product?.price}
          required
          error={state?.fields?.price}
        />
        <Field
          name="discountPercentage"
          label="Discount %"
          type="number"
          min="0"
          // 90 is a DB CHECK constraint: 100% would mean free.
          max="90"
          defaultValue={product?.discountPercentage ?? 0}
          error={state?.fields?.discountPercentage}
        />
        <Field
          name="stock"
          label="Stock"
          type="number"
          min="0"
          defaultValue={product?.stock ?? 0}
          required
          error={state?.fields?.stock}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="categoryId"
          label="Category"
          defaultValue={product?.category ? String(product.category.id) : ""}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          error={state?.fields?.categoryId}
        />
        <SelectField
          name="brandId"
          label="Brand"
          defaultValue={product?.brand ? String(product.brand.id) : ""}
          options={brands.map((b) => ({ value: String(b.id), label: b.name }))}
          error={state?.fields?.brandId}
        />
      </div>

      <ImageUploadField
        name="image"
        label="Image"
        folder="products"
        defaultValue={product?.image ?? ""}
        required
        error={state?.fields?.image}
      />
    </>
  );
}

export function CreateProductDialog({
  categories,
  brands,
}: {
  categories: Category[];
  brands: Brand[];
}) {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon />
          Add product
        </Button>
      }
      title="Add a product"
      description="A category and a brand are both required."
      action={createProductAction}
      submitLabel="Create product"
      successMessage="Product created"
    >
      {(state) => <Fields categories={categories} brands={brands} state={state} />}
    </FormDialog>
  );
}

export function EditProductDialog({
  product,
  categories,
  brands,
}: {
  product: Product;
  categories: Category[];
  brands: Brand[];
}) {
  return (
    <FormDialog
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Edit
        </Button>
      }
      title={`Edit ${product.name}`}
      action={updateProductAction}
      submitLabel="Save changes"
      successMessage="Product updated"
    >
      {(state) => (
        <Fields product={product} categories={categories} brands={brands} state={state} />
      )}
    </FormDialog>
  );
}
