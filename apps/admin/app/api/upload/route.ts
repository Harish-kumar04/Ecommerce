import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

function getApiUrl(): string {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export async function POST(req: NextRequest) {
  // 1. Verify admin auth via bearer token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  // Forward token to API to verify authentication
  try {
    const authCheck = await fetch(`${getApiUrl()}/stores/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // If backend actively rejects token with 401/403, deny access
    if (authCheck.status === 401 || authCheck.status === 403) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token" }, { status: 401 });
    }
  } catch {
    // If backend is offline/unreachable in local preview, proceed if token is non-empty
  }

  // 2. Parse file and metadata
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const cleanName = (file.name || "image.webp")
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-");
    const path = `${kind}/${Date.now()}-${cleanName}`;

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        {
          error: "BLOB_READ_WRITE_TOKEN is not configured in environment.",
          hint: "Add BLOB_READ_WRITE_TOKEN to your Vercel project environment variables.",
        },
        { status: 500 }
      );
    }

    const blob = await put(path, file, {
      access: "public",
      token: blobToken,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload image" }, { status: 500 });
  }
}
