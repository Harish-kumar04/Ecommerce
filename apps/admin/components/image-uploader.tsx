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

function getSizeBadge(ratio: [number, number], width: number): string {
  if (ratio[0] === 8 && ratio[1] === 3) return "Desktop 1920x720 (8:3)";
  if (ratio[0] === 4 && ratio[1] === 5 && width >= 1000) return "Mobile 1080x1350 (4:5)";
  if (ratio[0] === 4 && ratio[1] === 5) return "Popup 800x1000 (4:5)";
  if (ratio[0] === 3 && ratio[1] === 4) return "Cover 900x1200 (3:4)";
  return `${width}x${Math.round((width * ratio[1]) / ratio[0])} (${ratio[0]}:${ratio[1]})`;
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
  const [uploadedTick, setUploadedTick] = useState(false);
  const [instantPreview, setInstantPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sizeBadge = getSizeBadge(ratio, targetWidth);

  const processAndUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setUploadedTick(false);

    // 1. Instant preview
    const objectUrl = URL.createObjectURL(file);
    setInstantPreview(objectUrl);

    try {
      const img = new window.Image();
      img.src = objectUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Unable to read image file. Please choose a valid JPG, PNG, or WebP."));
      });

      // 2. Auto-fit onto canvas with target aspect ratio
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

      // 3. WebP conversion
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
      );

      if (!blob) throw new Error("Failed to encode image to WebP");

      // 4. Upload
      const formData = new FormData();
      const cleanBase = (file.name || "image").replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "-");
      formData.append("file", blob, `${cleanBase}.webp`);
      formData.append("kind", kind);

      const token = adminApi.getToken();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        const msg = data.error || data.message || `Upload failed with status ${res.status}`;
        throw new Error(msg);
      }

      // Check that server didn't send raw data: or blob:
      if (data.url.startsWith("blob:") || data.url.startsWith("data:")) {
        throw new Error("Invalid storage URL returned. Please paste an image URL under Advanced.");
      }

      // 5. Success
      onChange(data.url);
      setUploadedTick(true);
      setTimeout(() => setUploadedTick(false), 2500);
    } catch (err: any) {
      setInstantPreview(null);
      setError(err.message || "Failed to upload image. Please try pasting a direct image link under Advanced.");
    } finally {
      URL.revokeObjectURL(objectUrl);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File exceeds maximum allowed size of 10 MB.");
        return;
      }
      void processAndUpload(file);
    }
  };

  const handleApplyUrl = () => {
    const raw = urlInput.trim();
    if (!raw) return;
    if (raw.startsWith("blob:") || raw.startsWith("data:")) {
      setError("Cannot use local blob or data URLs. Please enter an HTTPS URL or upload a file.");
      return;
    }
    onChange(raw);
    setUrlInput("");
    setError(null);
  };

  const currentDisplay = instantPreview || (value && !value.startsWith("data:") && !value.startsWith("blob:") ? value : null);

  return (
    <div className="space-y-2">
      {/* Header Label + Dimensions */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
          {sizeBadge}
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Dropzone / Preview Area */}
      {!currentDisplay ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            isDragOver
              ? "border-[#E52320] bg-red-50/30"
              : "border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/40 hover:border-[#E52320] hover:bg-red-50/10"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E52320] border-t-transparent" />
              <p className="text-xs font-semibold text-gray-800 dark:text-neutral-200">
                Processing & WebP converting...
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-800 text-gray-500 shadow-sm group-hover:text-[#E52320]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-neutral-100">
                  Upload image <span className="font-normal text-gray-500">or drag & drop</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  JPG, PNG, WebP &bull; Auto-converted to WebP
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-800 bg-[#fafafa]">
              <Image
                src={currentDisplay}
                alt={label}
                fill
                sizes="80px"
                className="object-contain p-1"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-neutral-100">
                  Image Ready
                </span>
                {uploadedTick && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    ✓ Uploaded
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-gray-400 truncate max-w-[240px]">
                {currentDisplay.slice(0, 48)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-200"
            >
              {loading ? "..." : "Change"}
            </button>
            <button
              type="button"
              onClick={() => {
                setInstantPreview(null);
                onChange("");
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Red Error Box Below Slot */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">Upload Error</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Advanced URL Paste */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-neutral-400 flex items-center gap-1"
        >
          <span>{showAdvanced ? "▾" : "▸"}</span>
          <span>Advanced: Paste image URL</span>
        </button>

        {showAdvanced && (
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/banner.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyUrl();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 font-mono focus:outline-none focus:ring-2 focus:ring-[#E52320]"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
