import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import AttributionCapture from "@/components/attribution-capture";
import { LanguageProvider } from "@/components/language-provider";
import Toaster from "@/components/toaster-lazy";
import { CartRefreshBridge } from "@/components/cart-refresh-bridge";
import { LANG_BOOT_SCRIPT } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site-defaults";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-tamil",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
  description:
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam",
  icons: {
    icon: "/logo.jpg",
  },
  openGraph: {
    siteName: "முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam",
    images: [{ url: "/logo.jpg", alt: "Muthamilarignar Pathipagam" }],
    locale: "ta_IN",
    type: "website",
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