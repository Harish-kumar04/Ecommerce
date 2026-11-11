import dynamic from "next/dynamic";
import LanguageToggle from "./language-toggle";
import { CartButton, HeaderNav, type NavItem } from "./header/header-islands";
import HeaderLogo from "./header/header-logo";
import type { SearchBookItem } from "./header/header-search";

const HeaderSearch = dynamic(() => import("./header/header-search"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
      <div className="h-10 w-full rounded-full border border-black/15 bg-black/[0.03]" />
    </div>
  ),
});

const NAV: NavItem[] = [
  { path: "", ta: "முகப்பு", en: "Home" },
  { path: "/products", ta: "நூல்கள்", en: "Books" },
  { path: "/products?sale=1", ta: "சலுகைகள்", en: "Offers" },
  { path: "/track", ta: "ஆர்டர் நிலை", en: "Track Order" },
  { path: "/account", ta: "கணக்கு", en: "Account" },
];

export default function StorefrontHeader({
  tenant,
  searchBooks = [],
}: {
  tenant: string;
  searchBooks?: SearchBookItem[];
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.08] bg-white shadow-sm transition-all">
      {/* 1. Slim Top Announcement Bar (Solid Black) */}
      <div className="bg-black text-white text-[12px] py-1.5 px-4 font-medium tracking-wide">
        <div className="container-site flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-red animate-pulse" />
            <span className="i18n-ta">
              🚚 ₹500-க்கு மேல் இலவச விநியோகம் • ⚡ ரொக்கப் பணம் செலுத்தும் வசதி (Cash on Delivery) உண்டு
            </span>
            <span className="i18n-en">
              🚚 Free Delivery above ₹500 • ⚡ Cash on Delivery & Online Payment Available
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11.5px] text-white/70">
            <a href="tel:919003324473" className="hover:text-white transition-colors">
              📞 90033 24473
            </a>
            <span>|</span>
            <span>முத்தமிழறிஞர் பதிப்பகம்</span>
          </div>
        </div>
      </div>

      {/* 2. Main Header Row */}
      <div className="container-site flex items-center gap-3 py-2 sm:gap-6 lg:py-2.5">
        {/* Logo (56px mobile, 72px desktop -> 52px on scroll) */}
        <HeaderLogo tenant={tenant} />

        {/* Always-Visible Search Bar */}
        <div className="flex-1 max-w-md mx-auto">
          <HeaderSearch tenant={tenant} books={searchBooks} />
        </div>

        {/* Nav Links (Desktop) */}
        <HeaderNav tenant={tenant} items={NAV} variant="desktop" />

        {/* Actions: Language & Cart */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <LanguageToggle />
          <CartButton tenant={tenant} />
        </div>
      </div>

      {/* Mobile Swipe Nav Bar */}
      <HeaderNav tenant={tenant} items={NAV} variant="mobile" />
    </header>
  );
}