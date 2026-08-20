import type { Metadata } from "next";

import { CreateUserDialog, EditUserDialog } from "@/app/(panel)/users/user-dialogs";
import { EmptyRow } from "@/components/data-table/empty-row";
import { FilterSelect } from "@/components/data-table/filter-select";
import { SearchInput } from "@/components/data-table/search-input";
import { Pagination } from "@/components/pagination";
import { RoleBadge } from "@/components/panel/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { flatten, one, oneOf, positiveInt } from "@/lib/list-params";
import { listUsers } from "@/lib/resources";
import { ROLES } from "@/types/api";

export const metadata: Metadata = { title: "Users" };

const ROLE_FILTERS = [
  { value: "admin", label: "Admin" },
  { value: "user", label: "Customer" },
  { value: "deliveryman", label: "Delivery" },
];

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const params = await searchParams;

  const { rows, meta } = await listUsers({
    page: positiveInt(params.page) ?? 1,
    search: one(params.search),
    // Anything outside the enum is dropped rather than forwarded — the API would
    // answer 400 and take the whole page down with it.
    role: oneOf(params.role, ROLES),
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm tabular-nums">
            {meta.total} total
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <SearchInput basePath="/users" placeholder="Search name or email…" />
        <FilterSelect
          basePath="/users"
          param="role"
          label="Role"
          allLabel="All roles"
          options={ROLE_FILTERS}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message="No users found"
                hint="Try clearing the search or the role filter."
              />
            ) : (
              rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="size-8">
                      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                      <AvatarFallback className="text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <EditUserDialog user={user} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination meta={meta} basePath="/users" params={flatten(params)} />
    </div>
  );
}
