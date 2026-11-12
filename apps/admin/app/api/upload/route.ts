import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_ADMIN_ROLES = new Set([
  "platform_owner",
  "tenant_owner",
  "store_manager",
  "marketing_agent",
  "support_agent",
  "owner",
  "admin",
  "store_admin",
  "super_admin",
  "staff",
]);

function getApiUrl(): string {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

function detectImageMagic(bytes: Uint8Array): { ext: "png" | "jpg" | "webp" | "gif"; mime: string } | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // GIF87a / GIF89a: 47 49 46 38 (37|39) 61
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { ext: "gif", mime: "image/gif" };
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization token & admin role with the API FIRST
    const authHeader = (req.headers.get("authorization") || req.headers.get("Authorization") || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let meData: any = null;
    try {
      const meRes = await fetch(`${getApiUrl()}/auth/me`, {
        method: "GET",
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      if (!meRes.ok) {
        return NextResponse.json({ error: "Invalid or expired authentication token" }, { status: 401 });
      }
      meData = await meRes.json();
    } catch {
      return NextResponse.json({ error: "Failed to verify authentication token" }, { status: 503 });
    }

    const userRole = String(meData?.role || "").trim().toLowerCase();
    if (!ALLOWED_ADMIN_ROLES.has(userRole)) {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    // 2. Parse and validate uploaded image
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawKind = String(formData.get("kind") || "general");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const lowerName = (file.name || "").toLowerCase();
    const lowerMime = (file.type || "").toLowerCase();
    if (
      /\.(svg|svgz|html|htm|xhtml|xml|js)$/i.test(lowerName) ||
      lowerMime.includes("svg") ||
      lowerMime.includes("html") ||
      lowerMime.includes("xml") ||
      lowerMime.includes("javascript")
    ) {
      return NextResponse.json({ error: "SVG and HTML uploads are not allowed" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty file is not allowed" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds maximum allowed size of 5 MB" }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength <= 0 || bytes.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds maximum allowed size of 5 MB" }, { status: 413 });
    }

    const detected = detectImageMagic(bytes);
    if (!detected) {
      return NextResponse.json(
        { error: "Invalid image format. Only PNG, JPG, WEBP, and GIF are allowed." },
        { status: 400 }
      );
    }

    const safeKind = rawKind.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "general";
    const randomFilename = `${randomUUID()}.${detected.ext}`;
    const storagePath = `${safeKind}/${randomFilename}`;

    // 3. Try Vercel Blob if token is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      try {
        const blob = await put(storagePath, Buffer.from(bytes), {
          access: "public",
          contentType: detected.mime,
          addRandomSuffix: false,
          token: blobToken,
        });
        if (blob?.url) {
          return NextResponse.json({ url: blob.url });
        }
      } catch (blobErr: any) {
        console.warn("Vercel Blob upload failed, attempting fallback:", blobErr.message);
      }
    }

    // 4. Try backend S3/storage media upload
    try {
      const backendFormData = new FormData();
      backendFormData.append("file", new Blob([bytes], { type: detected.mime }), randomFilename);
      const backendRes = await fetch(`${getApiUrl()}/media/upload`, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: backendFormData,
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        const url =
          backendData.url ||
          backendData.location ||
          backendData.signed_url ||
          backendData.key;
        if (url) {
          return NextResponse.json({ url });
        }
      }
    } catch {
      // Backend media service unavailable
    }

    return NextResponse.json(
      {
        error:
          "Storage is not configured on this environment. Please configure BLOB_READ_WRITE_TOKEN or paste an image URL under Advanced.",
      },
      { status: 503 }
    );
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process image upload" },
      { status: 500 }
    );
  }
}
