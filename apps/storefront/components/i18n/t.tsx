import { splitBilingual } from "@/lib/i18n";

/**
 * Zero-JS bilingual text for Server Components.
 *
 * Renders both languages; CSS in globals.css shows only the one matching
 * `<html lang>` (set by LanguageProvider and the pre-paint boot script), so the
 * language toggle works instantly without hydrating the surrounding section.
 */
export function T({ ta, en }: { ta: string; en: string }) {
  if (ta === en) return <>{ta}</>;
  return (
    <>
      <span className="i18n-ta" lang="ta">
        {ta}
      </span>
      <span className="i18n-en" lang="en">
        {en}
      </span>
    </>
  );
}

/** Primary name in the active language for a `"தமிழ் | English"` value. */
export function BiName({ value }: { value?: string | null }) {
  const [ta, en] = splitBilingual(value, "|");
  return <T ta={ta} en={en} />;
}

/** Secondary name (the other language), or nothing when the value is not bilingual. */
export function BiSubName({ value }: { value?: string | null }) {
  if (!value || !String(value).includes("|")) return null;
  const [ta, en] = splitBilingual(value, "|");
  if (ta === en) return null;
  return <T ta={en} en={ta} />;
}
