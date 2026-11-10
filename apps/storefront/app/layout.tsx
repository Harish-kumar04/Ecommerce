import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import AttributionCapture from "@/components/attribution-capture";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { Toaster } from "@/components/toaster";
import { CartRefreshBridge } from "@/components/cart-refresh-bridge";

export const metadata: Metadata = {
  title: "Muthamilarignar Pathipagam | முத்தமிழறிஞர் பதிப்பகம்",
  description:
    "முத்தமிழறிஞர் பதிப்பகம் — திராவிட இயக்க வரலாறு, சமூகநீதி மற்றும் கலைஞர் படைப்புகள் | Official Bookstore of Muthamilarignar Pathipagam",
  icons: {
    icon: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const content = (
    <ThemeProvider>
      <LanguageProvider>
        <AttributionCapture />
        <CartRefreshBridge />
        {children}
        <Toaster />
      </LanguageProvider>
    </ThemeProvider>
  );

  return (
    <html lang="ta" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('infalette-theme');var e=(t==='dark'||t==='light')?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(e==='dark'){document.documentElement.classList.add('dark');}document.documentElement.setAttribute('data-theme',e);}catch(e){}})();",
          }}
        />
      </head>
      <body
        className="font-sans antialiased"
        style={{ fontFeatureSettings: '"ss01", "cv11"' }}
      >
        {clerkKey ? (
          <ClerkProvider publishableKey={clerkKey}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}