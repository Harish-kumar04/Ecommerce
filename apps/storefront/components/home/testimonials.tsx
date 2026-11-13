import { T } from "@/components/i18n/t";
import { SectionHeading } from "@/components/brand/patterns";

const READER_VOICES = [
  {
    quote_ta:
      "கலைஞர் அவர்களின் வரலாற்று நூல்களும் திராவிட இயக்க ஆவணங்களும் மிகத் தெளிவான அச்சில், உறுதியான கட்டமைப்புடன் கிடைக்கின்றன. ஆராய்ச்சி மாணவர்களுக்குப் பெரும் வரப்பிரசாதம்.",
    quote_en:
      "Kalaignar's historical works and Dravidian movement chronicles arrive with crisp Tamil print and sturdy binding — an invaluable resource for students and researchers.",
    author_ta: "முனைவர் செந்தில்குமார்",
    author_en: "Dr. Senthilkumar",
    role_ta: "தமிழ்த்துறை ஆய்வாளர், சென்னை",
    role_en: "Tamil Literature Researcher, Chennai",
  },
  {
    quote_ta:
      "ஆர்டர் செய்த மூன்று நாட்களில் பாதுகாப்பான பேக்கேஜிங்கில் புத்தகங்கள் வந்து சேர்ந்தன. புத்தகம் வந்ததும் பணம் செலுத்தும் வசதி (COD) மிகவும் பயனுள்ளதாக இருந்தது.",
    quote_en:
      "My books arrived within three days in protective packaging without a single bent corner. Having Cash on Delivery made ordering effortless for our family.",
    author_ta: "கவிதா இராமச்சந்திரன்",
    author_en: "Kavitha Ramachandran",
    role_ta: "வாசகர், கோயம்புத்தூர்",
    role_en: "Reader, Coimbatore",
  },
  {
    quote_ta:
      "இளைய தலைமுறை வாசிக்க வேண்டிய சமூகநீதி மற்றும் மாநில சுயாட்சி குறித்த அதிகாரப்பூர்வப் பதிப்புகளை ஒரே இடத்தில் வாங்க முடிகிறது.",
    quote_en:
      "Having official editions on social justice, language rights, and state autonomy in one trusted bookstore makes building a home library joyful.",
    author_ta: "அறிவழகன் மு.",
    author_en: "Arivazhagan M.",
    role_ta: "நூலக ஆர்வலர், மதுரை",
    role_en: "Library Collector, Madurai",
  },
];

/**
 * Reader Testimonials section (Server Component, zero client JS).
 */
export default function Testimonials() {
  return (
    <section aria-label="Reader Testimonials" className="cv-auto bg-white py-16 sm:py-24">
      <div className="container-site">
        <SectionHeading
          align="center"
          eyebrow={{ ta: "வாசகர் கருத்துகள்", en: "Reader Appreciation" }}
          title={{ ta: "வாசகர்கள் மற்றும் ஆய்வாளர்களின் பார்வை", en: "Trusted by Readers & Scholars" }}
        />

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {READER_VOICES.map((item) => (
            <blockquote
              key={item.author_en}
              className="card-glow flex flex-col justify-between p-6 sm:p-8"
            >
              <div>
                <svg
                  viewBox="0 0 32 32"
                  fill="currentColor"
                  aria-hidden="true"
                  className="h-8 w-8 text-brand-red/25"
                >
                  <path d="M10 8c-3.3 0-6 2.7-6 6v10h10V14H8c0-1.1.9-2 2-2V8zm14 0c-3.3 0-6 2.7-6 6v10h10V14h-6c0-1.1.9-2 2-2V8z" />
                </svg>
                <p className="mt-3 text-[14.5px] leading-relaxed text-black/80 sm:text-[15px]">
                  <T ta={item.quote_ta} en={item.quote_en} />
                </p>
              </div>

              <footer className="mt-6 border-t border-black/[0.06] pt-4">
                <p className="text-[14.5px] font-bold text-black">
                  <T ta={item.author_ta} en={item.author_en} />
                </p>
                <p className="text-[12.5px] text-black/65">
                  <T ta={item.role_ta} en={item.role_en} />
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
