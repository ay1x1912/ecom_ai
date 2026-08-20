import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlertIcon } from "lucide-react";

import { LoginForm } from "@/app/login/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, denied } = await searchParams;

  // Already signed in as an admin — nothing to do here.
  const session = await getSession();
  if (session?.role === "admin") redirect(typeof next === "string" ? next : "/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            BabyMart <span className="text-muted-foreground font-normal">admin</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in with an administrator account.
          </p>
        </div>

        {denied ? (
          <Alert className="mb-4">
            <ShieldAlertIcon />
            <AlertTitle>Administrator access required</AlertTitle>
            <AlertDescription>
              You are signed in, but this account cannot use the admin panel.
            </AlertDescription>
          </Alert>
        ) : null}

        <LoginForm next={typeof next === "string" ? next : undefined} />

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Accounts are created by an existing administrator — there is no sign-up.
        </p>
      </div>
    </div>
  );
}
