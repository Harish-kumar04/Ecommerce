import StorefrontHeader from "@/components/storefront-header";
import StorefrontFooter from "@/components/storefront-footer";
import WhatsAppFloat from "@/components/whatsapp-float";
import PromoPopup from "@/components/home/promo-popup";
import { getBooksWithFallback, getStoreWithFallback } from "@/lib/catalog-fallback";
import { getPopup, getSocial } from "@/lib/site-defaults";

/**
 * Shared chrome for every tenant page: header, footer, floating WhatsApp button and the
 * (optional, default-off) promotional popup. Store config comes from the same cached
 * fetches the pages use, so this adds no extra request per page view.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const [store, books] = await Promise.all([
    getStoreWithFallback(params.tenant),
    getBooksWithFallback(params.tenant),
  ]);
  const social = getSocial(store);
  const popup = getPopup(store);

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <StorefrontHeader tenant={params.tenant} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter tenant={params.tenant} social={social} bookCount={books.length} />
      <WhatsAppFloat social={social} />
      {popup.enabled && <PromoPopup tenant={params.tenant} popup={popup} />}
    </div>
  );
}