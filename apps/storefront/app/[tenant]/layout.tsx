import StorefrontHeader from "@/components/storefront-header";
import StorefrontFooter from "@/components/storefront-footer";
import WhatsAppFloat from "@/components/whatsapp-float";
import NotificationManager from "@/components/notification-manager-lazy";
import MiniCart from "@/components/cart/mini-cart-lazy";
import MobileBottomBar from "@/components/header/mobile-bottom-bar";
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

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <StorefrontHeader tenant={params.tenant} />
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