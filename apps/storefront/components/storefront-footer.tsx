"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

/**
 * Storefront footer — Muthamilarignar Pathipagam Bookstore Footer.
 */
export default function StorefrontFooter({ tenant }: { tenant: string }) {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-200 bg-brand-black text-neutral-200 mt-16">
      <div className="h-1 w-full bg-gradient-to-r from-black via-brand-red to-black" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Muthamilarignar Pathipagam"
                className="h-12 w-12 rounded-lg object-contain bg-white p-0.5"
              />
              <div>
                <p className="text-base font-bold tracking-tight text-white">
                  {t("முத்தமிழறிஞர் பதிப்பகம்", "Muthamilarignar Pathipagam")}
                </p>
                <p className="text-xs text-brand-red font-medium">
                  {t("Muthamilarignar Pathipagam", "முத்தமிழறிஞர் பதிப்பகம்")}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-neutral-400 max-w-md leading-relaxed">
              {t(
                "திராவிட இயக்க வரலாறு, சமூகநீதி, மாநில சுயாட்சி மற்றும் முத்தமிழறிஞர் கலைஞர் அவர்களின் படைப்புகளைத் தாங்கி வரும் அதிகாரப்பூர்வப் பதிப்பகம்.",
                "The official publishing house dedicated to Dravidian movement history, social justice, state autonomy, Dravidian Model governance, and the works of Muthamilarignar Kalaignar.",
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-red font-semibold mb-3">
              {t("நூலகம்", "Bookstore")}
            </p>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>
                <Link href={`/${tenant}/products`} className="hover:text-white hover:underline">
                  {t("அனைத்து நூல்கள் (27)", "All Books (27)")}
                </Link>
              </li>
              <li>
                <Link href={`/${tenant}/cart`} className="hover:text-white hover:underline">
                  {t("கூடை (Cart)", "Shopping Cart")}
                </Link>
              </li>
              <li>
                <Link href={`/${tenant}/orders`} className="hover:text-white hover:underline">
                  {t("எனது ஆர்டர்கள்", "My Orders")}
                </Link>
              </li>
              <li>
                <Link href={`/${tenant}/returns`} className="hover:text-white hover:underline">
                  {t("மாற்று / திரும்பப் பெறுதல்", "Returns & Support")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-red font-semibold mb-3">
              {t("வாசகர் கணக்கு", "Reader Account")}
            </p>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li>
                <Link href={`/${tenant}/account`} className="hover:text-white hover:underline">
                  {t("சுயவிவரம்", "Profile")}
                </Link>
              </li>
              <li>
                <Link href={`/${tenant}/track`} className="hover:text-white hover:underline">
                  {t("ஆர்டர் நிலையை அறிய", "Track Order")}
                </Link>
              </li>
              <li>
                <Link href={`/${tenant}/account/consent`} className="hover:text-white hover:underline">
                  {t("தனியுரிமை அமைப்புகள்", "Privacy & Consent")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-400">
          <p>
            © {year}{" "}
            {t(
              "முத்தமிழறிஞர் பதிப்பகம் (Muthamilarignar Pathipagam). அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
              "Muthamilarignar Pathipagam (முத்தமிழறிஞர் பதிப்பகம்). All rights reserved.",
            )}
          </p>
          <p>
            {t(
              "இந்தியா முழுவதும் விரைவான அஞ்சல் / கூரியர் விநியோகம்.",
              "Pan-India fast book delivery • Secure checkout via Razorpay, Stripe & COD.",
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}