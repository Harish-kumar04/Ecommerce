/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: {
    domains: ["localhost", "*.infalette.com", "images.unsplash.com", "img.clerk.com", "s3.ap-south-1.amazonaws.com", "res.cloudinary.com"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "cdn.infalette.com" },
      { protocol: "https", hostname: "**.infalette.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "**.clerk.com" },
      { protocol: "https", hostname: "s3.ap-south-1.amazonaws.com" },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "img-src 'self' data: blob: https://res.cloudinary.com https://*.public.blob.vercel-storage.com https://cdn.infalette.com https://*.infalette.com https://images.unsplash.com https://img.clerk.com https://*.clerk.com https://s3.ap-south-1.amazonaws.com",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' http://localhost:8000 https: ws: wss: https://res.cloudinary.com https://*.public.blob.vercel-storage.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
