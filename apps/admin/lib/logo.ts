export const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dikaxqooz/image/upload/v1794509921/Logo_vuhujt.jpg";
export const ADMIN_LOGO_ALT =
  "முத்தமிழறிஞர் பதிப்பகம் | Muthamilarignar Pathipagam";
export const LOGO_WIDTH = 1600;
export const LOGO_HEIGHT = 1596;

export function resolveAdminLogoUrl(raw?: string | null): string {
  const candidate = (raw || "").trim();
  if (candidate && candidate !== "/logo.jpg") {
    return candidate;
  }
  return DEFAULT_LOGO_URL;
}

export function cloudinaryLogoTransform(url: string, width: number, extra = ""): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  const transform = ["f_auto", "q_auto", `w_${width}`, extra].filter(Boolean).join(",");
  const afterUpload = url.split("/upload/")[1] || "";
  const firstSeg = afterUpload.split("/")[0] || "";
  if (firstSeg.includes("_") && !/^v\d+$/.test(firstSeg)) {
    return url;
  }
  return url.replace("/upload/", `/upload/${transform}/`);
}
