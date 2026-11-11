import Link from "next/link";
import Img from "./ui/img";
import LanguageToggle from "./language-toggle";
import { CartButton, HeaderNav, type NavItem } from "./header/header-islands";
import logo from "@/public/brand/logo-96.webp";

const NAV: NavItem[] = [
  { path: "", ta: "முகப்பு", en: "Home" },
  { path: "/products", ta: "நூல்கள்", en: "Books" },
  { path: "/orders", ta: "ஆர்டர்கள்", en: "Orders" },
  { path: "/track", ta: "ஆர்டர் நிலை", en: "Track Order" },
  { path: "/account", ta: "கணக்கு", en: "Account" },
];

/**
 * Storefront header (Server Component shell): logo + wordmark, simplified bilingual nav,
 * language toggle and cart badge. Only the nav highlight, cart count and language toggle
 * hydrate on the client.
 */
export default function StorefrontHeader({ tenant }: { tenant: string }) {
  const home = `/${tenant}`;
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.07] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="h-[3px] w-full bg-brand-red" aria-hidden="true" />
      <div className="container-site flex h-16 items-center gap-4 lg:h-[76px]">
        <Link href={home} className="group flex min-w-0 items-center gap-3" aria-label="முத்தமிழறிஞர் பதிப்பகம் / Muthamilarignar Pathipagam — Home">
          <Img
            src={logo}
            alt=""
            width={48}
            height={48}
            priority
            sizes="48px"
            className="h-10 w-10 flex-shrink-0 rounded-lg lg:h-12 lg:w-12"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold text-brand-red sm:text-[17px] lg:text-[19px]">முத்தமிழறிஞர் பதிப்பகம்</span>
            <span className="hidden truncate text-[11.5px] font-medium tracking-wide text-black/60 sm:block">Muthamilarignar Pathipagam</span>
          </span>
        </Link>

        <HeaderNav tenant={tenant} items={NAV} variant="desktop" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <CartButton tenant={tenant} />
        </div>
      </div>
      <HeaderNav tenant={tenant} items={NAV} variant="mobile" />
    </header>
  );
}