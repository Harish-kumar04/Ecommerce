import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

function getApiUrl(): string {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const cleanName = (file.name || "banner.webp")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-");
    const path = `${kind}/${Date.now()}-${cleanName}`;

    // 1. Try Vercel Blob if token is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      try {
        const blob = await put(path, file, {
          access: "public",
          token: blobToken,
        });
        if (blob?.url) {
          return NextResponse.json({ url: blob.url });
        }
      } catch (blobErr: any) {
        console.warn("Vercel Blob upload failed, attempting fallback:", blobErr.message);
      }
    }

    // 2. Try backend S3/storage media upload
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    try {
      const backendFormData = new FormData();
      backendFormData.append("file", file);
      const backendRes = await fetch(`${getApiUrl()}/media/upload`, {
        method: "POST",
        headers: authHeader ? { Authorization: authHeader } : {},
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

    // 3. Resilient Fallback: Convert to Base64 WebP Data URL
    // This ensures image uploads ALWAYS succeed even before external storage is configured.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/webp";
    const base64Url = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ url: base64Url });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process image upload" },
      { status: 500 }
    );
  }
}
