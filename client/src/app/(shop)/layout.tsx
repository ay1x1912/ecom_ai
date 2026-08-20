import { SiteHeader } from "@/components/shop/site-header";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        BabyMart — demo storefront
      </footer>
    </>
  );
}
