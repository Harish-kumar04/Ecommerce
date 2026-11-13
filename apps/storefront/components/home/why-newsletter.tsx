import { T } from "../i18n/t";
import Sunburst from "../brand/sunburst";
import NewsletterLazy from "../newsletter-lazy";

const REASONS = [
  {
    ta: "100% அதிகாரப்பூர்வப் பதிப்புகள்",
    en: "100% official editions",
    dta: "முத்தமிழறிஞர் பதிப்பகத்தின் நேரடி அச்சுப் பதிப்புகள் — உயர்தரத் தாள் மற்றும் நேர்த்தியான கட்டமைப்பு.",
    den: "Every book comes straight from Muthamilarignar Pathipagam, with original cover art and archival print quality.",
  },
  {
    ta: "பாதுகாப்பான கட்டணம்",
    en: "Secure checkout & COD",
    dta: "UPI, கார்டு, நெட்பேங்கிங் அல்லது புத்தகம் வரும்போது பணம் செலுத்தும் வசதி (COD).",
    den: "Pay by UPI, card or net banking — or cash on delivery.",
  },
  {
    ta: "இந்தியா முழுவதும் விநியோகம்",
    en: "Fast delivery across India",
    dta: "பாதுகாப்பான பேக்கேஜிங் மற்றும் உங்கள் ஆர்டரை உடனுக்குடன் அறியும் வசதி.",
    den: "Protective packaging and live order tracking from dispatch to your door.",
  },
];

export function WhySection() {
  return (
    <section className="container-site pt-20 sm:pt-28">
      <div className="text-center">
        <p className="eyebrow">
          <T ta="ஏன் எங்களிடம்?" en="Why order from us" />
        </p>
        <h2 className="mx-auto mt-2 max-w-3xl text-[28px] font-extrabold leading-tight tracking-tight text-black sm:text-[36px] lg:text-[44px]">
          <T ta="அறிவாற்றலும் சமூகநீதிச் சிந்தனையும்." en="Authentic editions. Pan-India delivery." />
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
        {REASONS.map((r, i) => (
          <div key={r.en} className="card-glow p-7 lg:p-8">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-red text-[16px] font-extrabold text-white">
              {i + 1}
            </span>
            <h3 className="mt-5 text-[18px] font-bold text-black lg:text-[20px]">
              <T ta={r.ta} en={r.en} />
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-black/65">
              <T ta={r.dta} en={r.den} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection({ storeId }: { storeId?: string | null }) {
  return (
    <section className="cv-auto container-site pt-20 sm:pt-28">
      <div className="relative overflow-hidden rounded-3xl border border-brand-red/15 bg-white px-6 py-14 text-center shadow-glow sm:px-12 lg:py-20">
        <Sunburst className="pointer-events-none absolute -bottom-1 left-1/2 w-[640px] max-w-none -translate-x-1/2 opacity-[0.07]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-[26px] font-extrabold leading-tight tracking-tight text-black sm:text-[34px]">
            <T ta="புதிய நூல் வெளியீடுகளை உடனுக்குடன் அறிய" en="Hear about new releases first" />
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-black/65 sm:text-[16px]">
            <T
              ta="புதிய பதிப்புகள் மற்றும் புத்தகக் கண்காட்சித் தள்ளுபடி அறிவிப்புகளைப் பெற பதிவு செய்யுங்கள்."
              en="Subscribe for new publications, reprints and book-fair offers."
            />
          </p>
          <div className="mt-8">
            <NewsletterLazy
              storeId={storeId}
              fallback={
                <form className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row" aria-busy="true">
                  <label htmlFor="newsletter-email" className="sr-only">
                    <T ta="மின்னஞ்சல் முகவரி" en="Email address" />
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="உங்கள் மின்னஞ்சல் / Your email"
                    autoComplete="email"
                    className="h-12 flex-1 rounded-full border border-black/15 bg-white px-5 text-[15px] focus:border-brand-red focus:outline-none"
                    required
                  />
                  <button type="button" className="btn-red h-12 text-[15px]">
                    <T ta="பதிவு செய்க" en="Subscribe" />
                  </button>
                  <p className="text-[13px] sm:sr-only" />
                </form>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
