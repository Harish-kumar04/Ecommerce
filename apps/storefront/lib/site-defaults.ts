/**
 * Site-wide defaults for the Muthamilarignar Pathipagam storefront.
 *
 * Everything here can be overridden per store from `store.theme_config`
 * (`home_slides`, `popup`, `social`) once the admin is wired up; until then the
 * defaults make the site look finished.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://muthamilarignar-storefront.vercel.app"
).replace(/\/$/, "");

export const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEMO_TENANT || "demo-store";

/** ISR window (seconds) for catalogue pages. */
export const REVALIDATE_SECONDS = 60;

export const BRAND = {
  nameTa: "முத்தமிழறிஞர் பதிப்பகம்",
  nameEn: "Muthamilarignar Pathipagam",
} as const;

/* ------------------------------------------------------------------ */
/* Social / contact                                                    */
/* ------------------------------------------------------------------ */

export interface SocialConfig {
  facebook: string;
  email: string;
  /** International digits only, e.g. 919003324473 */
  whatsapp: string;
  whatsappDisplay: string;
  whatsappButtonEnabled: boolean;
  whatsappMessage: string;
}

export const DEFAULT_SOCIAL: SocialConfig = {
  facebook: "https://www.facebook.com/p/Muthamilarignar-Pathipagam-61555144442937/",
  email: "muthamilarignar@gmail.com",
  whatsapp: "919003324473",
  whatsappDisplay: "90033 24473",
  whatsappButtonEnabled: true,
  whatsappMessage: "வணக்கம், நூல்கள் பற்றி அறிய விரும்புகிறேன்.",
};

export function whatsappHref(social: SocialConfig, withMessage = true): string {
  const base = `https://wa.me/${social.whatsapp}`;
  return withMessage ? `${base}?text=${encodeURIComponent(social.whatsappMessage)}` : base;
}

function formatIndianNumber(digits: string): string {
  const local = digits.replace(/^91(?=\d{10}$)/, "");
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : digits;
}

/* ------------------------------------------------------------------ */
/* Home hero slides                                                    */
/* ------------------------------------------------------------------ */

export interface HomeSlide {
  id?: string;
  image_url?: string | null;
  mobile_image_url?: string | null;
  alt_ta?: string;
  alt_en?: string;
  title_ta?: string;
  title_en?: string;
  subtitle_ta?: string;
  subtitle_en?: string;
  button_ta?: string;
  button_en?: string;
  link?: string;
  active?: boolean;
  starts_at?: string;
  ends_at?: string;
  /** Built-in slides only: book cover URLs drawn on the brand background. */
  covers?: string[];
}

export const MAX_SLIDES = 6;

/** Brand-coloured default slides (covers are filled from the live catalogue). */
export const DEFAULT_SLIDES: HomeSlide[] = [
  {
    title_ta: "முத்தமிழறிஞர் பதிப்பகம்",
    title_en: "Muthamilarignar Pathipagam",
    subtitle_ta: "திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் — அதிகாரப்பூர்வ இணைய நூலகம்.",
    subtitle_en: "Dravidian history, social justice and the works of Kalaignar — the official online bookstore.",
    button_ta: "நூல்களைக் காண்க",
    button_en: "Browse books",
    link: "/books",
    active: true,
  },
  {
    title_ta: "கலைஞர் படைப்புகள்",
    title_en: "The Works of Kalaignar",
    subtitle_ta: "முத்தமிழறிஞர் கலைஞர் அவர்களின் வாழ்க்கை, எழுத்து மற்றும் சாதனைகள்.",
    subtitle_en: "The life, writing and legacy of Muthamilarignar Kalaignar.",
    button_ta: "தொகுப்பைப் பார்க்க",
    button_en: "View collection",
    link: "/categories/kalaignar-works",
    active: true,
  },
  {
    title_ta: "திராவிட மாடல் & சமூகநீதி",
    title_en: "Dravidian Model & Social Justice",
    subtitle_ta: "இடஒதுக்கீடு, மாநில சுயாட்சி, மொழி உரிமை — சிந்தனையைத் தூண்டும் நூல்கள்.",
    subtitle_en: "Reservation, state autonomy and language rights — books that make you think.",
    button_ta: "இப்போதே வாங்குக",
    button_en: "Shop now",
    link: "/categories/dravidian-model-social-justice",
    active: true,
  },
];

/* ------------------------------------------------------------------ */
/* Notifications (popup & bar)                                        */
/* ------------------------------------------------------------------ */

export interface NotificationItem {
  id: string;
  type: "popup" | "bar";
  image_url?: string | null;
  title_ta?: string;
  title_en?: string;
  text_ta?: string;
  text_en?: string;
  button_ta?: string;
  button_en?: string;
  link?: string;
  active: boolean;
  starts_at?: string;
  ends_at?: string;
  delay_seconds?: number; // default 4
  frequency?: "once" | "daily" | "every_visit";
  pages?: "home" | "all";
}

export interface PopupConfig {
  enabled: boolean;
  image_url?: string | null;
  title_ta?: string;
  title_en?: string;
  text_ta?: string;
  text_en?: string;
  button_ta?: string;
  button_en?: string;
  link?: string;
  delay_seconds: number;
}

export const DEFAULT_POPUP: PopupConfig = {
  enabled: false,
  title_ta: "புதிய வெளியீடுகள்",
  title_en: "New releases",
  text_ta: "முத்தமிழறிஞர் பதிப்பகத்தின் புதிய நூல்களைக் காணுங்கள்.",
  text_en: "Discover the latest books from Muthamilarignar Pathipagam.",
  button_ta: "நூல்களைக் காண்க",
  button_en: "Browse books",
  link: "/products",
  delay_seconds: 4,
};

/* ------------------------------------------------------------------ */
/* Resolution from store.theme_config                                  */
/* ------------------------------------------------------------------ */

function themeConfig(store: any): Record<string, any> {
  const tc = store?.theme_config;
  if (!tc) return {};
  if (typeof tc === "string") {
    try {
      return JSON.parse(tc) || {};
    } catch {
      return {};
    }
  }
  return typeof tc === "object" ? tc : {};
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function isDateActive(starts_at?: string, ends_at?: string): boolean {
  const now = Date.now();
  if (starts_at) {
    const s = new Date(starts_at).getTime();
    if (!isNaN(s) && now < s) return false;
  }
  if (ends_at) {
    const e = new Date(ends_at).getTime();
    if (!isNaN(e) && now > e) return false;
  }
  return true;
}

export function getSocial(store: any): SocialConfig {
  const s = themeConfig(store).social || {};
  const whatsapp = str(s.whatsapp)?.replace(/\D/g, "") || DEFAULT_SOCIAL.whatsapp;
  return {
    facebook: str(s.facebook) || DEFAULT_SOCIAL.facebook,
    email: str(s.email) || DEFAULT_SOCIAL.email,
    whatsapp,
    whatsappDisplay:
      whatsapp === DEFAULT_SOCIAL.whatsapp ? DEFAULT_SOCIAL.whatsappDisplay : formatIndianNumber(whatsapp),
    whatsappButtonEnabled:
      typeof s.whatsapp_button_enabled === "boolean"
        ? s.whatsapp_button_enabled
        : DEFAULT_SOCIAL.whatsappButtonEnabled,
    whatsappMessage: DEFAULT_SOCIAL.whatsappMessage,
  };
}

/** Active admin slides (max 6), or the built-in brand slides when none are configured. */
export function getSlides(store: any): { slides: HomeSlide[]; isDefault: boolean } {
  const raw = themeConfig(store).home_slides;
  const list: HomeSlide[] = Array.isArray(raw)
    ? raw
        .filter((s: any) => {
          if (!s || s.active === false) return false;
          if (!isDateActive(s.starts_at, s.ends_at)) return false;
          return Boolean(str(s.image_url) || str(s.title_ta) || str(s.title_en));
        })
        .slice(0, MAX_SLIDES)
    : [];
  return list.length > 0 ? { slides: list, isDefault: false } : { slides: DEFAULT_SLIDES, isDefault: true };
}

export function getNotifications(store: any): NotificationItem[] {
  const raw = themeConfig(store).notifications;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item: any) => {
    if (!item || item.active === false) return false;
    if (!isDateActive(item.starts_at, item.ends_at)) return false;
    return Boolean(str(item.text_ta) || str(item.text_en) || str(item.title_ta) || str(item.title_en) || str(item.image_url));
  });
}

export function getPopup(store: any): PopupConfig {
  const p = themeConfig(store).popup;
  if (!p || typeof p !== "object") return DEFAULT_POPUP;
  const delay = Number(p.delay_seconds);
  return {
    ...DEFAULT_POPUP,
    ...p,
    enabled: p.enabled === true,
    delay_seconds: Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_POPUP.delay_seconds,
  };
}

/**
 * Resolve an admin-entered link: absolute URLs and #anchors pass through; site paths
 * are scoped to the tenant (`/products` -> `/demo-store/products`).
 */
export function resolveLink(tenant: string, link?: string | null): string | null {
  const l = str(link);
  if (!l) return null;
  if (/^(https?:|mailto:|tel:)/i.test(l) || l.startsWith("#")) return l;
  const path = l.startsWith("/") ? l : `/${l}`;
  return path === `/${tenant}` || path.startsWith(`/${tenant}/`) || path.startsWith(`/${tenant}?`)
    ? path
    : `/${tenant}${path}`;
}

export function isExternal(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

export interface AnnouncementConfig {
  enabled: boolean;
  ta: string;
  en: string;
  link?: string | null;
}

export function getAnnouncement(store: any): AnnouncementConfig {
  const tc = themeConfig(store);
  const raw = tc.announcement;
  if (raw && typeof raw === "object") {
    if (raw.enabled === false) {
      return { enabled: false, ta: "", en: "", link: null };
    }
    const ta = str(raw.text_ta || raw.ta);
    const en = str(raw.text_en || raw.en);
    if (ta || en) {
      return {
        enabled: true,
        ta: ta || en,
        en: en || ta,
        link: str(raw.link) || null,
      };
    }
  }
  const topTa = str(tc.announcement_ta);
  const topEn = str(tc.announcement_en);
  if (topTa || topEn) {
    return {
      enabled: true,
      ta: topTa || topEn,
      en: topEn || topTa,
      link: str(tc.announcement_link) || null,
    };
  }
  return {
    enabled: true,
    ta: "₹500-க்கு மேல் இலவச விநியோகம் • ரொக்கப் பணம் செலுத்தும் வசதி (COD) • 100% அதிகாரப்பூர்வப் பதிப்புகள்",
    en: "Free Pan-India Delivery above ₹500 • Cash on Delivery (COD) • 100% Official Publisher Editions",
    link: null,
  };
}

/**
 * If an image URL is hosted on Cloudinary (`/image/upload/`), inject
 * `f_auto,q_auto,w_<width>` immediately after `upload/` for fast WebP/AVIF delivery.
 */
export function cloudinaryImageUrl(src?: string | null, width: number = 900): string {
  if (!src) return "";
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src;
  const clamped = Math.max(64, Math.min(1920, Math.round(width || 900)));
  const after = src.slice(idx + marker.length);
  // Replace existing f_auto,q_auto,w_* if present so responsive loaders can emit multiple widths
  const existingMatch = after.match(/^f_auto,q_auto,w_\d+\/(.+)$/i);
  if (existingMatch) {
    return `${src.slice(0, idx + marker.length)}f_auto,q_auto,w_${clamped}/${existingMatch[1]}`;
  }
  if (/^(?:[a-z]{1,3}_[^/]+)(?:,[a-z]{1,3}_[^/]+)*\//i.test(after)) {
    return src;
  }
  return `${src.slice(0, idx + marker.length)}f_auto,q_auto,w_${clamped}/${after}`;
}

export function isCloudinaryUrl(src?: string | null): boolean {
  if (!src) return false;
  return src.includes("res.cloudinary.com") && src.includes("/image/upload/");
}

/**
 * Whether next/image may optimize this src via `/_next/image`. Must mirror
 * `images.remotePatterns` in next.config.js; Cloudinary URLs use our custom
 * Cloudinary loader (`f_auto,q_auto,w_<width>`), and unknown hosts fall back to `unoptimized`.
 */
export function canOptimize(src?: string | null): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const { protocol, hostname } = new URL(src);
    if (protocol !== "https:") return false;
    if (hostname === "res.cloudinary.com") return false;
    return (
      hostname === "s3.ap-south-1.amazonaws.com" ||
      hostname.endsWith(".public.blob.vercel-storage.com") ||
      hostname === "cdn.infalette.com" ||
      hostname.endsWith(".infalette.com")
    );
  } catch {
    return false;
  }
}
