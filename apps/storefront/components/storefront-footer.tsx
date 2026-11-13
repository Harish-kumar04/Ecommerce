import Image from "@/components/ui/img";
import Link from "next/link";
import { T } from "./i18n/t";
import PageLines from "./brand/page-lines";
import Sunburst from "./brand/sunburst";
import { FacebookIcon, MailIcon, WhatsAppIcon } from "./brand/icons";
import { type SocialConfig, whatsappHref } from "@/lib/site-defaults";
import footerLogo from "@/public/brand/logo-192.webp";

/**
 * Storefront footer (Server Component, zero client JS): solid black with red accents,
 * a layered "book pages" top edge, contact details and social icon buttons.
 */
export default function StorefrontFooter({
  tenant,
  social,
  bookCount,
}: {
  tenant: string;
  social: SocialConfig;
  bookCount?: number;
}) {
  const year = new Date().getFullYear();
  const home = `/${tenant}`;
  const count = bookCount ? ` (${bookCount})` : "";

  const socials = [
    { href: social.facebook, label: "Facebook — Muthamilarignar Pathipagam", Icon: FacebookIcon },
    { href: `mailto:${social.email}`, label: `Email / Gmail — ${social.email}`, Icon: MailIcon },
    { href: whatsappHref(social), label: `WhatsApp — ${social.whatsappDisplay}`, Icon: WhatsAppIcon },
  ];

  const linkCls = "inline-flex min-h-[36px] items-center text-white/80 transition-colors hover:text-white";

  return (
    <footer className="cv-auto mt-16">
      <PageLines className="h-8 sm:h-10" />
      <div className="pattern-white-dots relative overflow-hidden bg-brand-black text-white">
        <div className="h-1 w-full bg-brand-red" aria-hidden="true" />
        <Sunburst className="pointer-events-none absolute -right-16 -top-4 w-72 opacity-[0.06] sm:w-96" />
        <div className="container-site relative py-14 lg:py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Link href={home} prefetch={false} className="inline-block" aria-label="முத்தமிழறிஞர் பதிப்பகம்">
                <div className="inline-flex items-center justify-center rounded-2xl bg-white p-3 shadow-md">
                  <Image
                    src={footerLogo}
                    alt="முத்தமிழறிஞர் பதிப்பகம்"
                    width={96}
                    height={96}
                    sizes="96px"
                    className="h-24 w-24 object-contain"
                  />
                </div>
              </Link>
              <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/80">
                <T
                  ta="திராவிட இயக்க வரலாறு, சமூகநீதி, மாநில சுயாட்சி மற்றும் முத்தமிழறிஞர் கலைஞர் அவர்களின் படைப்புகளைத் தாங்கி வரும் அதிகாரப்பூர்வப் பதிப்பகம்."
                  en="The official publishing house for Dravidian movement history, social justice, state autonomy and the works of Muthamilarignar Kalaignar."
                />
              </p>
              <ul className="mt-6 flex items-center gap-3" aria-label="Social">
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-brand-red hover:bg-[#D11D1A]"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FF6B68]">
                <T ta="நூலகம்" en="Bookstore" />
              </p>
              <ul className="space-y-1.5 text-[14.5px]">
                <li><Link href={`${home}/products`} prefetch={false} className={linkCls}><T ta={`அனைத்து நூல்கள்${count}`} en={`All books${count}`} /></Link></li>
                <li><Link href={`${home}/cart`} prefetch={false} className={linkCls}><T ta="கூடை" en="Cart" /></Link></li>
                <li><Link href={`${home}/orders`} prefetch={false} className={linkCls}><T ta="எனது ஆர்டர்கள்" en="My orders" /></Link></li>
                <li><Link href={`${home}/returns`} prefetch={false} className={linkCls}><T ta="மாற்று / திரும்பப் பெறுதல்" en="Returns & support" /></Link></li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FF6B68]">
                <T ta="வாசகர் கணக்கு" en="Reader account" />
              </p>
              <ul className="space-y-1.5 text-[14.5px]">
                <li><Link href={`${home}/account`} prefetch={false} className={linkCls}><T ta="சுயவிவரம்" en="Profile" /></Link></li>
                <li><Link href={`${home}/track`} prefetch={false} className={linkCls}><T ta="ஆர்டர் நிலை" en="Track order" /></Link></li>
                <li><Link href={`${home}/account/consent`} prefetch={false} className={linkCls}><T ta="தனியுரிமை அமைப்புகள்" en="Privacy & consent" /></Link></li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <p className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[#FF6B68]">
                <T ta="தொடர்புக்கு" en="Contact" />
              </p>
              <ul className="space-y-2.5 text-[14.5px]">
                <li>
                  <a href={whatsappHref(social)} target="_blank" rel="noopener noreferrer" className={`gap-2.5 ${linkCls}`}>
                    <WhatsAppIcon className="h-4 w-4 flex-shrink-0 text-[#FF6B68]" /> WhatsApp: {social.whatsappDisplay}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${social.email}`} className={`gap-2.5 break-all ${linkCls}`}>
                    <MailIcon className="h-4 w-4 flex-shrink-0 text-[#FF6B68]" /> {social.email}
                  </a>
                </li>
                <li>
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer" className={`gap-2.5 ${linkCls}`}>
                    <FacebookIcon className="h-4 w-4 flex-shrink-0 text-[#FF6B68]" /> Facebook
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-[13px] text-white/75 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} <T ta="முத்தமிழறிஞர் பதிப்பகம். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை." en="Muthamilarignar Pathipagam. All rights reserved." />
            </p>
            <p>
              <T ta="இந்தியா முழுவதும் விநியோகம் • பாதுகாப்பான கட்டணம் • COD" en="Pan-India delivery • Secure checkout • Cash on delivery" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}