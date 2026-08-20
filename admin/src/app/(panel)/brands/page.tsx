import type { Metadata } from "next";

import { CreateBrandDialog, EditBrandDialog } from "@/app/(panel)/brands/brand-dialogs";
import { deleteBrandAction } from "@/actions/catalogue";
import { DeleteButton } from "@/components/data-table/delete-button";
import { EmptyRow } from "@/components/data-table/empty-row";
import { SearchInput } from "@/components/data-table/search-input";
import { Pagination } from "@/components/pagination";
import { ProductImage } from "@/components/product-image";
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
import { listBrands } from "@/lib/resources";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage({ searchParams }: PageProps<"/brands">) {
  const params = await searchParams;

  const { rows, meta } = await listBrands({
    page: positiveInt(params.page) ?? 1,
    search: one(params.search),
    sortBy: "name",
    sortOrder: "asc",
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            {meta.total} total
          </p>
        </div>
        <CreateBrandDialog />
      </div>

      <SearchInput basePath="/brands" placeholder="Search brands…" />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No brands yet" />
            ) : (
              rows.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="bg-muted relative size-10 overflow-hidden rounded border">
                      {brand.image ? (
                        <ProductImage src={brand.image} alt="" sizes="2.5rem" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(brand.createdAt)}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <EditBrandDialog brand={brand} />
                    <DeleteButton
                      id={brand.id}
                      label={brand.name}
                      description="Products of this brand must be moved or removed first."
                      action={deleteBrandAction}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/brands" params={flatten(params)} />
    </div>
  );
}
