import type { Metadata } from "next";

import {
  CreateBannerDialog,
  EditBannerDialog,
} from "@/app/(panel)/banners/banner-dialogs";
import { deleteBannerAction } from "@/actions/catalogue";
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
import { flatten, one, positiveInt } from "@/lib/list-params";
import { listBanners } from "@/lib/resources";

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage({ searchParams }: PageProps<"/banners">) {
  const params = await searchParams;

  const { rows, meta } = await listBanners({
    page: positiveInt(params.page) ?? 1,
    search: one(params.search),
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Banners</h1>
          <p className="text-muted-foreground text-sm">
            Marketing slots the storefront renders — data an admin edits, not a
            deploy.
          </p>
        </div>
        <CreateBannerDialog />
      </div>

      <SearchInput basePath="/banners" placeholder="Search banners…" />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Headline</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={5}
                message="No banners yet"
                hint="Add one to promote something on the storefront."
              />
            ) : (
              rows.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="bg-muted relative h-10 w-20 overflow-hidden rounded border">
                      {banner.image ? (
                        <ProductImage src={banner.image} alt="" sizes="5rem" />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {banner.name}
                    {banner.startFrom ? (
                      <span className="text-muted-foreground ml-2 text-xs">
                        {banner.startFrom}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {banner.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    {banner.bannerType ? (
                      <Badge variant="secondary">{banner.bannerType}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <EditBannerDialog banner={banner} />
                    <DeleteButton
                      id={banner.id}
                      label={banner.name}
                      action={deleteBannerAction}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/banners" params={flatten(params)} />
    </div>
  );
}
