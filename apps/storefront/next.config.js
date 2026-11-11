/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const IMAGE_HOSTS = [
  "https://s3.ap-south-1.amazonaws.com",
  "https://*.public.blob.vercel-storage.com",
  "https://cdn.infalette.com",
  "https://*.infalette.com",
];

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "cdn.infalette.com" },
      { protocol: "https", hostname: "**.infalette.com" },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
          `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "connect-src 'self' https:" + (isDev ? " http://localhost:8000 ws:" : ""),
          "frame-src 'self'",
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Hashed build output: safe to cache forever.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Unhashed public assets (logo, brand images): long-lived, revalidated in the background.
        source: "/:file((?!_next/).+\\.(?:jpg|jpeg|png|webp|avif|svg|ico|gif))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};
