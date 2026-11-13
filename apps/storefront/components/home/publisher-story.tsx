import Link from "next/link";
import BrandLogo from "@/components/brand/brand-logo";
import { T } from "@/components/i18n/t";
import { ArrowRightIcon } from "@/components/brand/icons";
import { SectionHeading, SunburstBackdrop } from "@/components/brand/patterns";
import { DEFAULT_LOGO_URL } from "@/lib/site-defaults";

/**
 * Author & Publisher Story section (Server Component).
 * Celebrates Muthamilarignar Pathipagam's mission preserving Dravidian movement history,
 * social justice, language rights, and Muthamilarignar Kalaignar's literary works.
 */
export default function PublisherStory({
  tenant,
  totalBooks,
  logoUrl = DEFAULT_LOGO_URL,
}: {
  tenant: string;
  totalBooks: number;
  logoUrl?: string;
}) {
  const pillars = [
    {
      ta: "வரலாற்று ஆவணப் பாதுகாப்பு",
      en: "Archival Historical Editions",
      dta: "திராவிட இயக்கத்தின் அரிய சொற்பொழிவுகள், கட்டுரைகள் மற்றும் வரலாற்றுப் பதிவுகள்.",
      den: "Carefully proofread speeches, essays, and primary chronicles of the Dravidian movement.",
    },
    {
      ta: "உயர்தர அச்சு மற்றும் கட்டமைப்பு",
      en: "Lasting Print Craftsmanship",
      dta: "நீண்ட காலம் நிலைக்கும் தாள் தரம், தெளிவான தமிழ் எழுத்துருக்கள் மற்றும் நேர்த்தியான அட்டை.",
      den: "Crisp Tamil typography, archival-grade paper, and durable binding built for libraries and homes.",
    },
    {
      ta: "நேரடிப் பதிப்பக விநியோகம்",
      en: "Direct From the Publisher",
      dta: "இடைத்தரகர்கள் இன்றி பதிப்பகத்திலிருந்து நேரடியாக வாசகர்களின் கைகளுக்கு.",
      den: "Every order ships directly from Muthamilarignar Pathipagam with protective packaging.",
    },
  ];

  return (
    <section
      aria-label="Publisher Story"
      className="cv-auto relative overflow-hidden bg-[#FAFAFA] py-16 sm:py-24"
    >
      <SunburstBackdrop position="center" />

      <div className="container-site relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Emblem Card */}
          <div className="lg:col-span-5">
            <div className="card-glow pattern-red-dots relative overflow-hidden p-8 sm:p-10 text-center">
              <div className="mx-auto inline-flex rounded-3xl border border-black/10 bg-white p-5 shadow-md">
                <BrandLogo
                  src={logoUrl}
                  sizes="144px"
                  className="h-32 sm:h-36"
                  penSize="md"
                />
              </div>

              <h3 className="mt-6 text-[22px] font-extrabold text-black sm:text-[24px]">
                <T ta="முத்தமிழறிஞர் பதிப்பகம்" en="Muthamilarignar Pathipagam" />
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-black/70">
                <T
                  ta="தமிழ் மொழி, இனமானம், சமூகநீதி மற்றும் மக்களாட்சி விழுமியங்களை அடுத்த தலைமுறைக்குக் கொண்டு செல்லும் அறிவுச் சுடர்."
                  en="Carrying forward Tamil literary excellence, social justice, and democratic thought for every generation of readers."
                />
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[12.5px] font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-brand-red" aria-hidden="true" />
                <T
                  ta={`${totalBooks} அதிகாரப்பூர்வ வெளியீடுகள்`}
                  en={`${totalBooks} Official Publications`}
                />
              </div>
            </div>
          </div>

          {/* Right Narrative + 3 Pillars */}
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow={{ ta: "எமது பதிப்பகப் பயணம்", en: "Publisher & Literary Legacy" }}
              title={{
                ta: "எழுத்தால் விளைந்த சமூக மறுமலர்ச்சி",
                en: "Preserving Words That Shaped Modern Tamil Nadu",
              }}
              subtitle={{
                ta: "முத்தமிழறிஞர் கலைஞர் அவர்களின் எழுத்தாற்றலும், திராவிட இயக்கச் சிந்தனையாளர்களின் வரலாற்றுப் படைப்புகளும் காலத்தால் அழியாத அறிவுக் கருவூலங்கள். அவற்றை அசல் வடிவிலும் எளிய விலையிலும் உலகத் தமிழர்களிடம் சேர்ப்பதே முத்தமிழறிஞர் பதிப்பகத்தின் நோக்கம்.",
                en: "From Muthamilarignar Kalaignar's landmark writings to foundational Dravidian movement scholarship, our mission is to make authentic editions accessible to students, scholars, and readers everywhere.",
              }}
            />

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {pillars.map((p, i) => (
                <div
                  key={p.en}
                  className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-card"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#D11D1A] text-[13px] font-extrabold text-white">
                    0{i + 1}
                  </span>
                  <h3 className="mt-3 text-[15px] font-bold text-black">
                    <T ta={p.ta} en={p.en} />
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-black/70">
                    <T ta={p.dta} en={p.den} />
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href={`/${tenant}/books`}
                prefetch={false}
                className="btn-black h-12 px-7 text-[14.5px]"
              >
                <T ta="முழுத் தொகுப்பையும் காண்க" en="Explore the full archive" />
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
