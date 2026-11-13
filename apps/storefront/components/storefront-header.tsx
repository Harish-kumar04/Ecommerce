import Link from "next/link";
import LanguageToggle from "./language-toggle";
import { CartButton, HeaderNav, type NavItem } from "./header/header-islands";
import HeaderLogo from "./header/header-logo";
import HeaderSearch, { type SearchBookItem } from "./header/header-search";
import {
  DEFAULT_SOCIAL,
  isExternal,
  resolveLink,
  type AnnouncementConfig,
  type SocialConfig,
} from "@/lib/site-defaults";

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
  announcement,
  social = DEFAULT_SOCIAL,
}: {
  tenant: string;
  searchBooks?: SearchBookItem[];
  announcement?: AnnouncementConfig;
  social?: SocialConfig;
}) {
  const showAnnouncement = announcement ? announcement.enabled : true;
  const annTa =
    announcement?.ta ||
    "₹500-க்கு மேல் இலவச விநியோகம் • ரொக்கப் பணம் செலுத்தும் வசதி (COD) • 100% அதிகாரப்பூர்வப் பதிப்புகள்";
  const annEn =
    announcement?.en ||
    "Free Pan-India Delivery above ₹500 • Cash on Delivery (COD) • 100% Official Publisher Editions";
  const annHref = announcement?.link ? resolveLink(tenant, announcement.link) : null;

  const tickerText = (
    <>
      <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-brand-red" aria-hidden="true" />
      <span className="i18n-ta truncate">{annTa}</span>
      <span className="i18n-en truncate">{annEn}</span>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.08] bg-white shadow-sm transition-all">
      {/* 1. Admin-Controlled Top Announcement Ticker (Solid Black, High Contrast) */}
      {showAnnouncement && (
        <div
          role="region"
          aria-label="Store announcement"
          className="border-b border-white/10 bg-black px-4 py-1.5 text-[12px] font-medium tracking-wide text-white"
        >
          <div className="container-site flex items-center justify-between gap-4">
            {annHref ? (
              isExternal(annHref) ? (
                <a
                  href={annHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 hover:underline"
                >
                  {tickerText}
                </a>
              ) : (
                <Link href={annHref} prefetch={false} className="flex min-w-0 items-center gap-2 hover:underline">
                  {tickerText}
                </Link>
              )
            ) : (
              <div className="flex min-w-0 items-center gap-2">{tickerText}</div>
            )}

            <div className="hidden items-center gap-4 text-[12px] text-white/80 md:flex flex-shrink-0">
              <a
                href={`tel:${social.whatsapp}`}
                className="transition-colors hover:text-white"
              >
                +91 {social.whatsappDisplay}
              </a>
              <span className="text-white/30" aria-hidden="true">
                |
              </span>
              <span className="font-semibold text-white/90">முத்தமிழறிஞர் பதிப்பகம்</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Header Row */}
      <div className="container-site flex items-center gap-2.5 py-2 sm:gap-5 lg:py-2.5">
        {/* Prominent Publisher Logo */}
        <HeaderLogo tenant={tenant} />

        {/* Rounded Instant Search Bar */}
        <div className="mx-auto flex-1 max-w-md">
          <HeaderSearch tenant={tenant} books={searchBooks} />
        </div>

        {/* Desktop Nav */}
        <HeaderNav tenant={tenant} items={NAV} variant="desktop" />

        {/* Actions: Language Toggle & Live Cart */}
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <CartButton tenant={tenant} />
        </div>
      </div>

      {/* Mobile Swipe Nav Bar */}
      <HeaderNav tenant={tenant} items={NAV} variant="mobile" />
    </header>
  );
}