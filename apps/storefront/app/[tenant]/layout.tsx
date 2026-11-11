import StorefrontHeader from "@/components/storefront-header";
import StorefrontFooter from "@/components/storefront-footer";
import WhatsAppFloat from "@/components/whatsapp-float";
import dynamic from "next/dynamic";
import NotificationManager from "@/components/notification-manager-lazy";
import MiniCart from "@/components/cart/mini-cart-lazy";
const MobileBottomBar = dynamic(() => import("@/components/header/mobile-bottom-bar"), { ssr: false });
import { getBooksWithFallback, getStoreWithFallback } from "@/lib/catalog-fallback";
import { getNotifications, getPopup, getSocial } from "@/lib/site-defaults";

/**
 * Shared chrome for every tenant page: header, footer, floating WhatsApp button,
 * slide-over mini-cart, mobile bottom tab bar, and notification manager.
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
  const notifications = getNotifications(store);

  const searchBooks = books.map((b: any) => ({
    id: String(b.id),
    name: String(b.name || ""),
    author: b.author || b.dimensions_json?.book?.author || null,
    price_cents: Number(b.price_cents) || 0,
    sale_price_cents: b.sale_price_cents ?? null,
    image_url: b.images?.[0] || b.image_url || null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <StorefrontHeader tenant={params.tenant} searchBooks={searchBooks} />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <StorefrontFooter tenant={params.tenant} social={social} bookCount={books.length} />
      <WhatsAppFloat social={social} />
      <MiniCart tenant={params.tenant} />
      <MobileBottomBar tenant={params.tenant} />
      <NotificationManager
        tenant={params.tenant}
        notifications={notifications}
        fallbackPopup={popup}
      />
    </div>
  );
}