import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-defaults";

const PRIVATE_PATHS = [
  "/admin",
  "/admin/",
  "/cart",
  "/*/cart",
  "/checkout",
  "/*/checkout",
  "/account",
  "/*/account",
  "/orders",
  "/*/orders",
  "/api/",
  "/_next/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
