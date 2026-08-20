import type { Metadata } from "next";
import { CreditCardIcon } from "lucide-react";

import { MockCheckoutForm } from "@/app/mock-checkout/mock-checkout-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Payment" };

/**
 * Stand-in for a hosted gateway page.
 *
 * The backend's mock provider returns a checkoutUrl pointing here
 * (`${CLIENT_URL}/mock-checkout?session=…&order=…`), so this page has to exist
 * for the payment round-trip to close. It is deliberately outside the shop
 * layout and outside proxy.ts's protected matcher: a real gateway page is not
 * part of our site chrome and does not hold our session.
 */
export default async function MockCheckoutPage({
  searchParams,
}: PageProps<"/mock-checkout">) {
  const params = await searchParams;
  const session = typeof params.session === "string" ? params.session : "";
  const order = typeof params.order === "string" ? params.order : "";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="bg-muted mb-2 flex size-10 items-center justify-center rounded-lg">
            <CreditCardIcon className="size-5" />
          </div>
          <CardTitle>Mock payment gateway</CardTitle>
          <CardDescription>
            A real integration would redirect to the provider here. Choose an
            outcome to drive the same settlement path a live webhook would.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Order</dt>
              <dd className="font-medium">{order || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Session</dt>
              <dd className="truncate font-mono text-xs">{session || "—"}</dd>
            </div>
          </dl>

          <MockCheckoutForm sessionId={session} />
        </CardContent>
      </Card>
    </div>
  );
}
