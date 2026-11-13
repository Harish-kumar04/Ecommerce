import { WhatsAppIcon } from "./brand/icons";
import { type SocialConfig, whatsappHref } from "@/lib/site-defaults";

/** Fixed 56px WhatsApp chat button (lifted above mobile bottom bar on <lg viewports). */
export default function WhatsAppFloat({ social }: { social: SocialConfig }) {
  if (!social.whatsappButtonEnabled) return null;
  return (
    <a
      href={whatsappHref(social)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp-ல் தொடர்பு கொள்ள / Chat on WhatsApp (${social.whatsappDisplay})`}
      title="WhatsApp"
      className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,.18)] ring-4 ring-white transition-transform hover:scale-105 focus-visible:outline-offset-4 lg:bottom-5 lg:right-5"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
