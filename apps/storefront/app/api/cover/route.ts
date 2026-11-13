import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { canOptimize } from "@/lib/site-defaults";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_LIMIT = 96;
const memCache = new Map<string, { body: Uint8Array; contentType: string }>();

function setCache(key: string, value: { body: Uint8Array; contentType: string }) {
  if (memCache.size >= CACHE_LIMIT) {
    const oldest = memCache.keys().next().value;
    if (oldest) memCache.delete(oldest);
  }
  memCache.set(key, value);
}

/**
 * Transcodes legacy static `.gif` book cover uploads on allowlisted storage hosts
 * into responsive AVIF/WebP (`/_next/image` skips `.gif` optimization by design).
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url") || "";
  if (!rawUrl || rawUrl.startsWith("/") || !canOptimize(rawUrl)) {
    return NextResponse.json({ error: "Invalid cover URL" }, { status: 400 });
  }

  const width = Math.max(
    64,
    Math.min(1200, Number(req.nextUrl.searchParams.get("w")) || 640),
  );
  const quality = Math.max(
    50,
    Math.min(85, Number(req.nextUrl.searchParams.get("q")) || 75),
  );
  const accept = req.headers.get("accept") || "";
  const preferAvif = accept.includes("image/avif") && !accept.includes("image/webp");
  const fmt = preferAvif ? "avif" : "webp";
  const cacheKey = `${fmt}:${width}:${quality}:${rawUrl}`;

  const hit = memCache.get(cacheKey);
  if (hit) {
    return new NextResponse(Buffer.from(hit.body), {
      status: 200,
      headers: {
        "Content-Type": hit.contentType,
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        Vary: "Accept",
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const upstream = await fetch(rawUrl, { signal: controller.signal });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream cover fetch failed" }, { status: 502 });
    }
    const ab = await upstream.arrayBuffer();
    if (ab.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Cover image too large" }, { status: 413 });
    }

    const pipeline = sharp(Buffer.from(ab), { animated: false }).resize({
      width,
      withoutEnlargement: true,
    });
    const out = preferAvif
      ? await pipeline.avif({ quality: Math.max(45, quality - 10) }).toBuffer()
      : await pipeline.webp({ quality }).toBuffer();

    const contentType = preferAvif ? "image/avif" : "image/webp";
    const entry = { body: new Uint8Array(out), contentType };
    setCache(cacheKey, entry);

    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        Vary: "Accept",
      },
    });
  } catch {
    return NextResponse.json({ error: "Cover optimization error" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
