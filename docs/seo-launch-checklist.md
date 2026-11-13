# SEO, AEO & Google Business Launch Checklist — Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்)

Last updated: 2026-11-13

## 1. Environment & Canonical Domain Setup
- [ ] Set `NEXT_PUBLIC_SITE_URL` in Vercel (Production) to the canonical HTTPS apex/subdomain (no trailing slash, e.g. `https://muthamilarignarpathipagam.com`).
- [ ] Confirm `NEXT_PUBLIC_DEMO_TENANT` matches the active production tenant slug (e.g. `demo-store` or custom tenant slug).
- [ ] Verify HTTP -> HTTPS and `www` -> apex (or vice-versa) return single-hop `308`/`301` redirects.
- [ ] Confirm `<link rel="canonical" ...>` on `/[tenant]`, `/[tenant]/books`, `/[tenant]/books/<slug>`, `/[tenant]/about`, `/[tenant]/authors/<slug>`, `/[tenant]/faq`, and `/[tenant]/policies/*` resolves to `NEXT_PUBLIC_SITE_URL`.

## 2. Google Search Console (GSC) Verification & Indexing
- [ ] Open [Google Search Console](https://search.google.com/search-console) and add a **Domain Property** (`DNS TXT` record at your DNS registrar).
- [ ] Submit XML sitemaps in **Indexing -> Sitemaps**:
  - `https://<your-domain>/sitemap.xml`
  - `https://<your-domain>/<tenant>/sitemap.xml`
- [ ] Use **URL Inspection** to request indexing on priority pages:
  - Home (`/<tenant>`)
  - All Books (`/<tenant>/books`)
  - About Publisher (`/<tenant>/about`)
  - Muthamilarignar Kalaignar Author Page (`/<tenant>/authors/muthamilarignar-kalaignar`)
  - Top 5 flagship books (`/<tenant>/books/doctor-kalaignar`, `/<tenant>/books/kaalatthin-niram-karuppu-sivappu`, etc.)
- [ ] Confirm `/cart`, `/checkout`, `/account`, `/orders`, and `/admin` report **Excluded by `robots.txt` / `noindex`** (and legacy `/products/*` canonicalizes to `/books/*`).

## 3. Google Rich Results & Schema.org Validation
Test live URLs in [Google Rich Results Test](https://search.google.com/test/rich-results) and [Schema Markup Validator](https://validator.schema.org/):
- [ ] **Home (`/<tenant>`)**: Verify `Organization`, `BookStore`, `WebSite` (`SearchAction`), `BreadcrumbList`, and `FAQPage` parse with **0 errors**.
- [ ] **Book Detail (`/<tenant>/books/<slug>`)**: Verify `Product` + `Book`, `Offer` (`priceCurrency: "INR"`, `price`, `availability`, `itemCondition`), `publisher`, `author`, and `BreadcrumbList` parse with **0 errors** (and confirm `AggregateRating` only appears when genuine verified reviews exist).
- [ ] **Catalog & Category (`/<tenant>/books`, `/<tenant>/categories/<slug>`)**: Verify `ItemList` and `BreadcrumbList`.
- [ ] **Author Page (`/<tenant>/authors/muthamilarignar-kalaignar`)**: Verify `Person` (`name`, `alternateName`, `affiliation`, `sameAs`) + `BreadcrumbList`.
- [ ] **FAQ Page (`/<tenant>/faq`)**: Verify `FAQPage` (`mainEntity` Q&A pairs).

## 4. Google Business Profile (NAP Consistency)
Ensure Name, Address, and Phone (**NAP**) match **character-for-character** across Google Business Profile, website footer, `/about`, `/policies/*`, JSON-LD, and `/llms.txt`:
- [ ] **Business Name**: `முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam`
- [ ] **Primary Category**: `Book Publisher` / `Book Store`
- [ ] **Address**: `Anna Arivalayam Campus, Teynampet, Chennai – 600018, Tamil Nadu, India`
- [ ] **Phone / WhatsApp**: `+91 90033 24473`
- [ ] **Email**: `muthamilarignar@gmail.com`
- [ ] **Website**: `https://<your-domain>/<tenant>`
- [ ] **Social Profile (`sameAs`)**: `https://www.facebook.com/p/Muthamilarignar-Pathipagam-61555144442937/`

## 5. Answer Engine / AI Search Readiness (AEO / GEO)
- [ ] Fetch `https://<your-domain>/llms.txt` (and `/<tenant>/llms.txt`) and confirm HTTP `200 text/plain` with current catalog titles, INR prices, and contact details.
- [ ] Fetch `https://<your-domain>/robots.txt` and confirm `GPTBot`, `ClaudeBot`, `PerplexityBot`, and `Google-Extended` are explicitly allowed on `/` and `/llms.txt` while disallowed on `/admin`, `/cart`, `/checkout`, `/account`, `/orders`, and `/api/`.
- [ ] Verify every book page displays its crawlable opening summary paragraph (title, author/publisher, language, binding, INR price, 0% GST, COD availability) in plain HTML without requiring JavaScript execution.
