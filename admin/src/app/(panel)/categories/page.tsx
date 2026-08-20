import type { Metadata } from "next";

import {
  CreateCategoryDialog,
  EditCategoryDialog,
} from "@/app/(panel)/categories/category-dialogs";
import { deleteCategoryAction } from "@/actions/catalogue";
import { DeleteButton } from "@/components/data-table/delete-button";
import { EmptyRow } from "@/components/data-table/empty-row";
import { SearchInput } from "@/components/data-table/search-input";
import { Pagination } from "@/components/pagination";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { flatten, one, positiveInt } from "@/lib/list-params";
import { listCategories } from "@/lib/resources";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({
  searchParams,
}: PageProps<"/categories">) {
  const params = await searchParams;

  const { rows, meta } = await listCategories({
    page: positiveInt(params.page) ?? 1,
    search: one(params.search),
    sortBy: "name",
    sortOrder: "asc",
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            {meta.total} total
          </p>
        </div>
        <CreateCategoryDialog />
      </div>

      <SearchInput basePath="/categories" placeholder="Search categories…" />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} message="No categories yet" />
            ) : (
              rows.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="bg-muted relative size-10 overflow-hidden rounded border">
                      {category.image ? (
                        <ProductImage src={category.image} alt="" sizes="2.5rem" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    {category.categoryType ? (
                      <Badge variant="secondary">{category.categoryType}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(category.createdAt)}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <EditCategoryDialog category={category} />
                    <DeleteButton
                      id={category.id}
                      label={category.name}
                      description="Products in this category must be moved or removed first."
                      action={deleteCategoryAction}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/categories" params={flatten(params)} />
    </div>
  );
}
