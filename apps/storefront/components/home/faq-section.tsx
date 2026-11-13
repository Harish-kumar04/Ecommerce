import Link from "next/link";
import { T } from "@/components/i18n/t";
import { SectionHeading } from "@/components/brand/patterns";
import { STORE_FAQS, type FaqEntry } from "@/lib/aeo-data";

/**
 * Crawlable, zero-JS Server Component FAQ accordion using semantic <details>/<summary>.
 * Every answer is rendered directly in SSR HTML so search engines and AI answer engines
 * can index and quote it without executing JavaScript.
 */
export default function FaqSection({
  tenant,
  faqs = STORE_FAQS,
  showAllLink = true,
}: {
  tenant: string;
  faqs?: FaqEntry[];
  showAllLink?: boolean;
}) {
  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className="border-t border-black/[0.08] bg-white py-14 sm:py-20"
    >
      <div className="container-site max-w-4xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow={{ ta: "அடிக்கடி கேட்கப்படும் கேள்விகள்", en: "Reader FAQ & Quick Answers" }}
            title={{
              ta: "நூல் வாங்குதல், COD & விநியோக விவரங்கள்",
              en: "Ordering, Delivery & Publisher FAQ",
            }}
          />
          {showAllLink && (
            <Link
              href={`/${tenant}/faq`}
              prefetch={false}
              className="btn-outline h-11 px-5 text-[13.5px]"
            >
              <T ta="அனைத்து வினா-விடைகளும்" en="Full FAQ & Policies" />
            </Link>
          )}
        </div>

        <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-[#FAFAFA]">
          {faqs.map((item, idx) => (
            <details
              key={item.id}
              open={idx < 2}
              className="group px-5 py-4 sm:px-6 sm:py-5"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 text-left text-[15.5px] font-bold text-black hover:text-brand-red-dark sm:text-[16.5px]">
                <span>
                  <T ta={item.questionTa} en={item.questionEn} />
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-[18px] font-bold text-brand-red-dark transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 pr-2 text-[14.5px] leading-relaxed text-black/80">
                <p>
                  <T ta={item.answerTa} en={item.answerEn} />
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
