"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { adminApi } from "@/lib/api";

interface ImageUploaderProps {
  label: string;
  ratio: [number, number]; // [width, height], e.g. [8, 3] or [3, 4]
  targetWidth: number;
  value?: string;
  onChange: (url: string) => void;
  kind?: string;
  required?: boolean;
}

export default function ImageUploader({
  label,
  ratio,
  targetWidth,
  value,
  onChange,
  kind = "general",
  required = false,
}: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetHeight = Math.round((targetWidth * ratio[1]) / ratio[0]);

  const processAndUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Unable to read image file. Please try another file."));
      });

      URL.revokeObjectURL(objectUrl);

      // Auto-fit onto canvas with target aspect ratio
      const targetRatio = ratio[0] / ratio[1];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize canvas graphics context");

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.naturalWidth;
      let sourceHeight = img.naturalHeight;
      const currentRatio = sourceWidth / sourceHeight;

      if (currentRatio > targetRatio) {
        sourceWidth = Math.round(sourceHeight * targetRatio);
        sourceX = Math.round((img.naturalWidth - sourceWidth) / 2);
      } else {
        sourceHeight = Math.round(sourceWidth / targetRatio);
        sourceY = Math.round((img.naturalHeight - sourceHeight) / 2);
      }

      const finalWidth = Math.min(targetWidth, Math.max(800, sourceWidth));
      const finalHeight = Math.round(finalWidth / targetRatio);

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalWidth, finalHeight);

      // Encode to WebP
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
      );

      if (!blob) throw new Error("Failed to encode image to WebP");

      // Upload to /api/upload
      const formData = new FormData();
      const cleanBase = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "-");
      formData.append("file", blob, `${cleanBase}.webp`);
      formData.append("kind", kind);

      const token = adminApi.getToken();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed. You can also paste an image URL directly below.");
      }

      onChange(data.url);
    } catch (err: any) {
      console.error("Image upload error:", err);
      setError(err.message || "Failed to upload image. Please try pasting a direct image link.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 10 MB.");
      return;
    }

    void processAndUpload(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput("");
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <span className="text-[11px] text-gray-400">
          Recommended: {targetWidth}x{targetHeight} ({ratio[0]}:{ratio[1]})
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">Upload Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-neutral-800 pb-1.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`pb-1 font-medium transition-colors border-b-2 ${
            mode === "upload"
              ? "border-red-600 text-red-600 dark:text-red-400"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Upload File
        </button>
        <span className="text-gray-300 dark:text-neutral-700">|</span>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`pb-1 font-medium transition-colors border-b-2 ${
            mode === "url"
              ? "border-red-600 text-red-600 dark:text-red-400"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Paste Image URL
        </button>
      </div>

      {/* Mode 1: File Upload */}
      {mode === "upload" && (
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!value ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer rounded-xl border-2 border-dashed border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/40 p-5 text-center transition-all hover:border-red-500 hover:bg-red-50/20"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                    Optimizing & uploading image...
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-neutral-800 text-gray-500 shadow-sm group-hover:text-red-600">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-neutral-200">
                    Click to choose image file
                  </p>
                  <p className="text-[11px] text-gray-400">
                    JPG, PNG, WebP &bull; Auto-scaled
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50">
                  <Image
                    src={value}
                    alt={label}
                    fill
                    sizes="80px"
                    className="object-contain p-0.5"
                    unoptimized={value.startsWith("data:")}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-neutral-200 truncate max-w-[220px]">
                    Image selected
                  </p>
                  <p className="text-[10.5px] font-mono text-gray-400 truncate max-w-[220px]">
                    {value.slice(0, 45)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-200"
                >
                  {loading ? "..." : "Replace"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Paste Direct URL */}
      {mode === "url" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/banner.jpg or /logo.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyUrl();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90"
            >
              Apply
            </button>
          </div>

          {value && (
            <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50">
                  <Image
                    src={value}
                    alt={label}
                    fill
                    sizes="80px"
                    className="object-contain p-0.5"
                    unoptimized={value.startsWith("data:")}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-neutral-200 truncate">
                    Active URL
                  </p>
                  <p className="text-[10.5px] font-mono text-gray-400 truncate max-w-[220px]">
                    {value}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
