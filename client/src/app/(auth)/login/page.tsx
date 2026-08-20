import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  // Already signed in — nothing to do here.
  if (await getSession()) redirect(typeof next === "string" ? next : "/products");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your BabyMart account.
        </p>
      </div>

      <LoginForm next={typeof next === "string" ? next : undefined} />

      <p className="text-muted-foreground text-center text-sm">
        No account yet?{" "}
        <Link href="/register" className="text-foreground font-medium underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
