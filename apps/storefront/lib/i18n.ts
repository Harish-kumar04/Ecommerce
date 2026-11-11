/**
 * Framework-agnostic bilingual helpers (safe in Server and Client Components).
 *
 * Product / category names are stored as `"தமிழ் | English"`, long descriptions as
 * `"தமிழ் விளக்கம் || English description"`.
 */
export type Lang = "ta" | "en";

export function splitBilingual(raw?: string | null, sep: "|" | "||" = "|"): [string, string] {
  if (!raw) return ["", ""];
  const str = String(raw);
  if (sep === "||" && str.includes("||")) {
    const [ta, ...rest] = str.split("||");
    return [ta.trim(), rest.join("||").trim() || ta.trim()];
  }
  if (str.includes("|")) {
    const [ta, ...rest] = str.split("|");
    return [ta.trim(), rest.join("|").trim() || ta.trim()];
  }
  return [str.trim(), str.trim()];
}

/** Inline script (runs before paint) that applies the saved language to <html lang>. */
export const LANG_BOOT_SCRIPT =
  "try{var l=localStorage.getItem('mp-lang');if(l==='en'||l==='ta')document.documentElement.lang=l}catch(e){}";
