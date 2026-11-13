import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import AttributionCapture from "@/components/attribution-capture";
import { LanguageProvider } from "@/components/language-provider";
import Toaster from "@/components/toaster-lazy";
import { CartRefreshBridge } from "@/components/cart-refresh-bridge";
import { LANG_BOOT_SCRIPT } from "@/lib/i18n";
import {
  DEFAULT_LOGO_URL,
  LOGO_ALT,
  SITE_URL,
  cloudinaryImageUrl,
} from "@/lib/site-defaults";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-tamil",
});

const defaultShareImg = cloudinaryImageUrl(DEFAULT_LOGO_URL, 1200);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
  description:
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam",
  icons: {
    icon: cloudinaryImageUrl(DEFAULT_LOGO_URL, 192),
    apple: cloudinaryImageUrl(DEFAULT_LOGO_URL, 180),
  },
  openGraph: {
    siteName: LOGO_ALT,
    images: [{ url: defaultShareImg, width: 1200, height: 1197, alt: LOGO_ALT }],
    locale: "ta_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [defaultShareImg],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ta"
      className={`${inter.variable} ${notoTamil.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved language before first paint so the CSS language switch never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased bg-white text-black">
        <LanguageProvider>
          <AttributionCapture />
          <CartRefreshBridge />
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}