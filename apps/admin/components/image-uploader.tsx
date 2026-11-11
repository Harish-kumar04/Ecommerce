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
  const [cropPreview, setCropPreview] = useState<{
    originalImg: HTMLImageElement;
    file: File;
    canvasUrl: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetHeight = Math.round((targetWidth * ratio[1]) / ratio[0]);

  const requiredSpecsText = `Required: ${targetWidth} x ${targetHeight} px (${ratio[0]}:${ratio[1]}), JPG/PNG/WebP, max 5 MB`;

  const processAndUpload = async (img: HTMLImageElement, file: File, cropCenter = false) => {
    setLoading(true);
    setError(null);
    try {
      const targetRatio = ratio[0] / ratio[1];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not initialize canvas context");

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.naturalWidth;
      let sourceHeight = img.naturalHeight;

      if (cropCenter) {
        const currentRatio = sourceWidth / sourceHeight;
        if (currentRatio > targetRatio) {
          // Source is wider than target: crop sides
          sourceWidth = Math.round(sourceHeight * targetRatio);
          sourceX = Math.round((img.naturalWidth - sourceWidth) / 2);
        } else {
          // Source is taller than target: crop top/bottom
          sourceHeight = Math.round(sourceWidth / targetRatio);
          sourceY = Math.round((img.naturalHeight - sourceHeight) / 2);
        }
      }

      // Output size capped at targetWidth max
      const finalWidth = Math.min(targetWidth, sourceWidth);
      const finalHeight = Math.round(finalWidth / targetRatio);

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, finalWidth, finalHeight);

      // Re-encode to WebP ~0.82
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.82)
      );

      if (!blob) throw new Error("Could not encode image to WebP");

      // Upload to /api/upload
      const formData = new FormData();
      const filename = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      formData.append("file", blob, filename);
      formData.append("kind", kind);

      const token = adminApi.getToken();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image to server");
      }

      if (!data.url) {
        throw new Error("No URL returned from upload server");
      }

      onChange(data.url);
      setCropPreview(null);
    } catch (err: any) {
      setError(err.message || "Failed to process and upload image");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 5 MB
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Reject if width < 50% of target
      if (naturalWidth < targetWidth * 0.5) {
        setError(
          `Image width (${naturalWidth}px) is too small. Minimum required is ${Math.round(targetWidth * 0.5)}px.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const targetRatio = ratio[0] / ratio[1];
      const actualRatio = naturalWidth / naturalHeight;
      const diff = Math.abs(actualRatio - targetRatio) / targetRatio;

      // If ratio off by more than 3%, show center-crop preview
      if (diff > 0.03) {
        // Generate preview
        const previewCanvas = document.createElement("canvas");
        const pCtx = previewCanvas.getContext("2d");
        let sWidth = naturalWidth;
        let sHeight = naturalHeight;
        let sX = 0;
        let sY = 0;

        if (actualRatio > targetRatio) {
          sWidth = Math.round(naturalHeight * targetRatio);
          sX = Math.round((naturalWidth - sWidth) / 2);
        } else {
          sHeight = Math.round(naturalWidth / targetRatio);
          sY = Math.round((naturalHeight - sHeight) / 2);
        }

        previewCanvas.width = 400;
        previewCanvas.height = Math.round(400 / targetRatio);
        pCtx?.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, previewCanvas.width, previewCanvas.height);

        setCropPreview({
          originalImg: img,
          file,
          canvasUrl: previewCanvas.toDataURL(),
        });
      } else {
        void processAndUpload(img, file, false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("Failed to load selected image file.");
    };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        <span className="text-xs text-gray-500 font-medium">{requiredSpecsText}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Center-Crop Confirmation Modal / Preview */}
      {cropPreview && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-900">
            Image aspect ratio is different from the required {ratio[0]}:{ratio[1]}. Would you like to use the center-cropped version?
          </p>
          <div className="relative mx-auto max-w-xs overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cropPreview.canvasUrl} alt="Crop Preview" className="w-full h-auto object-contain" />
          </div>
          <div className="flex items-center gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setCropPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Choose another
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => processAndUpload(cropPreview.originalImg, cropPreview.file, true)}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              {loading ? "Uploading…" : "Use cropped"}
            </button>
          </div>
        </div>
      )}

      {/* Image Preview or Upload Dropzone */}
      {value ? (
        <div className="relative group rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-4">
          <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <Image src={value} alt={label} fill sizes="112px" className="object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-mono text-gray-600">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center cursor-pointer transition-colors hover:border-red-600 hover:bg-red-50/30"
        >
          <svg
            className="h-8 w-8 text-gray-400 group-hover:text-red-600 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <p className="mt-2 text-xs font-semibold text-gray-700 group-hover:text-red-700">
            {loading ? "Uploading WebP…" : "Click or drag to upload image"}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">{requiredSpecsText}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
