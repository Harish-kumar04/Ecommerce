import { fetchBooksSafe, getCategoriesWithFallback } from "@/lib/catalog-fallback";
import { splitBilingual } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site-defaults";
import { PUBLISHER_ENTITY } from "@/lib/seo-schema";
import { AUTHORS, POLICY_LAST_UPDATED_ISO } from "@/lib/aeo-data";

export async function buildLlmsMarkdown(tenant: string, baseOrigin = SITE_URL): Promise<string> {
  const [booksRes, categories] = await Promise.all([
    fetchBooksSafe(tenant),
    getCategoriesWithFallback(tenant),
  ]);
  const home = `${baseOrigin}/${tenant}`;
  const books = (booksRes.books as any[]).slice(0, 40);

  const lines: string[] = [
    `# ${PUBLISHER_ENTITY.nameEn} (${PUBLISHER_ENTITY.nameTa})`,
    "",
    `> Official Tamil and English online bookstore of ${PUBLISHER_ENTITY.nameEn} (${PUBLISHER_ENTITY.nameTa}), headquartered at ${PUBLISHER_ENTITY.addressLineEn}. Publishes authentic printed editions on Dravidian movement history, social justice, constitutional federalism, language rights, the Dravidian Model of governance, and the literary and political works of Muthamilarignar Dr. Kalaignar M. Karunanidhi.`,
    "",
    `Last updated: ${POLICY_LAST_UPDATED_ISO}`,
    "",
    "## Key Pages",
    `- [Home](${home}): Featured releases, curated collections, publisher story, and FAQ.`,
    `- [All Books Catalog](${home}/books): Complete bilingual catalog with instant search, category filters, and sorting.`,
    `- [About the Publisher](${home}/about): Official entity profile, mission, and verified Chennai contact details.`,
    `- [Authors](${home}/authors): Profiles and bibliographies for Muthamilarignar Kalaignar, M. K. Stalin, and Dravidian movement scholars.`,
    `- [FAQ](${home}/faq): Direct answers on pan-India shipping, Cash on Delivery (COD), Razorpay payments, and returns.`,
    `- [Shipping Policy](${home}/policies/shipping): 24–48h Chennai dispatch, 3–6 business days in Tamil Nadu, free delivery above ₹500.`,
    `- [Returns & Refunds Policy](${home}/policies/returns): 7-day free replacement or full refund for damaged or misprinted books.`,
    `- [Privacy Policy](${home}/policies/privacy): Reader data protection and PCI-DSS payment security.`,
    `- [Terms & Conditions](${home}/policies/terms): Authentic editions, INR pricing, and 0% GST on printed books.`,
    `- [XML Sitemap](${baseOrigin}/sitemap.xml)`,
    "",
    "## Categories",
    ...(categories as any[])
      .filter((c) => c?.slug)
      .map((c) => {
        const [ta, en] = splitBilingual(c.name, "|");
        return `- [${ta}${en && en !== ta ? ` | ${en}` : ""}](${home}/categories/${c.slug})`;
      }),
    "",
    "## Authors",
    ...AUTHORS.map((a) => `- [${a.nameEn} (${a.nameTa})](${home}/authors/${a.slug}): ${a.honorificEn}`),
    "",
    "## Featured & Published Books (INR, 0% GST)",
    ...books.map((b) => {
      const [ta, en] = splitBilingual(b.name, "|");
      const priceInr = Math.round(((b.sale_price_cents && b.sale_price_cents < b.price_cents ? b.sale_price_cents : b.price_cents) || 0) / 100);
      const slugOrId = b.slug || b.id;
      return `- [${ta}${en && en !== ta ? ` | ${en}` : ""}](${home}/books/${slugOrId}) — ₹${priceInr}`;
    }),
    "",
    "## How to Buy",
    "- Browse any book page and click **Add to Cart** or **Buy Now** (no mandatory account signup required).",
    "- Enter recipient name, 10-digit Indian mobile number, street address, and 6-digit Indian pincode on the single-page checkout.",
    "- Pay via **Cash on Delivery (COD)** or **Online Payment** (UPI, Cards, NetBanking via Razorpay).",
    "- Free pan-India shipping automatically applies on orders of ₹500 and above; printed books attract 0% GST in India.",
    "",
    "## Verified Contact & Publisher Entity",
    `- Legal / Brand Name: ${PUBLISHER_ENTITY.nameTa} | ${PUBLISHER_ENTITY.nameEn}`,
    `- Address: ${PUBLISHER_ENTITY.addressLineEn}`,
    `- Phone / WhatsApp: +91 ${PUBLISHER_ENTITY.phoneDisplay} (${PUBLISHER_ENTITY.phoneE164})`,
    `- Email: ${PUBLISHER_ENTITY.email}`,
    `- Official Facebook: ${PUBLISHER_ENTITY.sameAs[0]}`,
    "",
  ];

  return lines.join("\n");
}
