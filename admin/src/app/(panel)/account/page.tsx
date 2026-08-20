import type { Metadata } from "next";

import { AccountForm } from "@/app/(panel)/account/account-form";
import { RoleBadge } from "@/components/panel/role-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">My account</h1>
        <RoleBadge role={admin.role} />
        <span className="text-muted-foreground text-sm">
          Joined {formatDate(admin.createdAt)}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your own role is not editable here — changing it would lock you out on
            the next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm user={admin} />
        </CardContent>
      </Card>
    </div>
  );
}
