"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/image-uploader";
import { adminApi } from "@/lib/api";

interface Slide {
  id: string;
  image_url: string;
  mobile_image_url?: string;
  alt_ta: string;
  alt_en: string;
  link?: string;
  active: boolean;
}

interface NotificationConfig {
  enabled: boolean;
  type: "popup" | "bar";
  image_url?: string;
  title_ta: string;
  title_en: string;
  text_ta: string;
  text_en: string;
  button_ta?: string;
  button_en?: string;
  link?: string;
  delay_seconds: number;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: "default-slide-1",
    image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1920&q=80",
    mobile_image_url: "",
    alt_ta: "முத்தமிழறிஞர் பதிப்பகம் — அரிய நூல்கள்",
    alt_en: "Muthamilarignar Pathipagam — Rare Books",
    link: "/products",
    active: true,
  },
  {
    id: "default-slide-2",
    image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1920&q=80",
    mobile_image_url: "",
    alt_ta: "கலைஞர் நூற்றாண்டு விழா நூல்கள்",
    alt_en: "Kalaignar Centenary Collection",
    link: "/products",
    active: true,
  },
  {
    id: "default-slide-3",
    image_url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1920&q=80",
    mobile_image_url: "",
    alt_ta: "திராவிட இயக்க வரலாற்றுத் தொகுப்புகள்",
    alt_en: "Dravidian Movement Historical Volumes",
    link: "/products",
    active: true,
  },
];

export default function HomepageOffersPage() {
  const [tab, setTab] = useState<"slides" | "notifications">("slides");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [popup, setPopup] = useState<NotificationConfig>({
    enabled: false,
    type: "popup",
    image_url: "",
    title_ta: "சிறப்புச் சலுகை!",
    title_en: "Special Offer!",
    text_ta: "இன்றைய ஆர்டர்களுக்கு இலவச விநியோகம்.",
    text_en: "Free delivery on today's book orders.",
    button_ta: "நூல்களைப் பார்க்க",
    button_en: "Shop Books",
    link: "/products",
    delay_seconds: 4,
  });

  // Load current settings with public fallback if token is expired
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setAuthExpired(false);

      let loadedSettings = null;
      try {
        loadedSettings = await adminApi.getStoreSettings();
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("expired") || msg.includes("401") || msg.includes("Unauthorized")) {
          setAuthExpired(true);
        }

        // Try public store fallback
        try {
          const rawApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const base = rawApi.replace(/\/$/, "");
          const publicRes = await fetch(`${base}/api/v1/public/store`).catch(() => null);
          if (publicRes && publicRes.ok) {
            loadedSettings = await publicRes.json();
          }
        } catch {}
      }

      if (loadedSettings) {
        setSettings(loadedSettings);
        const tc = loadedSettings.theme_config || loadedSettings.store?.theme_config || {};
        if (Array.isArray(tc.home_slides) && tc.home_slides.length > 0) {
          setSlides(tc.home_slides);
        } else {
          setSlides(DEFAULT_SLIDES);
        }

        if (tc.popup && typeof tc.popup === "object") {
          setPopup((prev) => ({ ...prev, ...tc.popup }));
        }
      } else {
        setSlides(DEFAULT_SLIDES);
      }

      setLoading(false);
    }

    void loadData();
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const currentTc = settings?.theme_config || settings?.store?.theme_config || {};
      const updatedTc = {
        ...currentTc,
        home_slides: slides,
        popup: popup,
      };

      await adminApi.updateStoreSettings({
        theme_config: updatedTc,
      });

      setMessage("Homepage slides and offers updated successfully!");
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      const msg = err.message || "Failed to save settings.";
      if (msg.includes("expired") || msg.includes("401") || msg.includes("Unauthorized")) {
        setAuthExpired(true);
        setError("Your admin session has expired. Please sign in again to save your changes.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Slide helpers
  const updateSlide = (idx: number, patch: Partial<Slide>) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const addSlide = () => {
    if (slides.length >= 6) {
      alert("Maximum 6 slides allowed.");
      return;
    }
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      image_url: "",
      mobile_image_url: "",
      alt_ta: "சிறப்புச் சலுகை",
      alt_en: "Special Offer",
      link: "/products",
      active: true,
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  const removeSlide = (idx: number) => {
    if (confirm("Remove this slide?")) {
      setSlides((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const moveSlide = (idx: number, direction: "up" | "down") => {
    setSlides((prev) => {
      const copy = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            Homepage & Offers
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
            Manage scrolling hero banner slides and promotional announcement popups.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#E52320] text-white hover:bg-[#c91e1b] transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>

      {/* Prominent Session Expiry Alert with Re-login */}
      {authExpired && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Admin Login Session Expired
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Your login token has expired. Please sign in again in a new tab so you can save your changes.
            </p>
          </div>
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap"
          >
            Sign In Again &rarr;
          </a>
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div className="rounded-2xl border border-green-200 bg-green-50 dark:bg-green-950/40 p-4 text-sm text-green-800 dark:text-green-300 shadow-sm">
          &check; {message}
        </div>
      )}

      {error && !authExpired && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 shadow-sm flex items-center justify-between">
          <p>{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-xs font-bold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setTab("slides")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "slides"
              ? "bg-[#E52320] text-white shadow-sm"
              : "text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900"
          }`}
        >
          Hero Banner Slides ({slides.length}/6)
        </button>

        <button
          type="button"
          onClick={() => setTab("notifications")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "notifications"
              ? "bg-[#E52320] text-white shadow-sm"
              : "text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900"
          }`}
        >
          Promotional Popup {popup.enabled ? "(Active)" : "(Disabled)"}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading settings...</div>
      ) : tab === "slides" ? (
        /* TAB 1: HERO BANNER SLIDES */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Desktop banners display at 1920&times;720 (8:3). Mobile banners optionally display at 1080&times;1350 (4:5).
            </p>
            <div className="flex items-center gap-2">
              {slides.length === 0 && (
                <button
                  type="button"
                  onClick={() => setSlides(DEFAULT_SLIDES)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 hover:bg-gray-50"
                >
                  Load 3 Brand Defaults
                </button>
              )}
              {slides.length < 6 && (
                <button
                  type="button"
                  onClick={addSlide}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90"
                >
                  <span>+</span> Add New Slide
                </button>
              )}
            </div>
          </div>

          {/* List of Slide Cards */}
          <div className="space-y-5">
            {slides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm space-y-4"
              >
                {/* Slide Card Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                      Slide {idx + 1} {slide.alt_en ? `— ${slide.alt_en}` : ""}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                        slide.active
                          ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                          : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {slide.active ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active Toggle */}
                    <button
                      type="button"
                      onClick={() => updateSlide(idx, { active: !slide.active })}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        slide.active
                          ? "border-green-300 text-green-700 hover:bg-green-50"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {slide.active ? "Pause" : "Activate"}
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlide(idx, "up")}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      title="Move Up"
                    >
                      &uarr;
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={() => moveSlide(idx, "down")}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-800 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      title="Move Down"
                    >
                      &darr;
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete Slide"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Banner Images: Desktop & Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Desktop Banner */}
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/30 p-3.5 space-y-2">
                    <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">
                      Desktop Banner Image <span className="text-red-600">*</span>
                    </p>
                    <ImageUploader
                      label="Desktop Banner"
                      ratio={[8, 3]}
                      targetWidth={1920}
                      value={slide.image_url}
                      onChange={(url) => updateSlide(idx, { image_url: url })}
                      kind="home-hero"
                      required
                    />
                  </div>

                  {/* Mobile Banner (Optional) */}
                  <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/30 p-3.5 space-y-2">
                    <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">
                      Mobile Banner Image (Optional)
                    </p>
                    <ImageUploader
                      label="Mobile Banner"
                      ratio={[4, 5]}
                      targetWidth={1080}
                      value={slide.mobile_image_url || ""}
                      onChange={(url) => updateSlide(idx, { mobile_image_url: url })}
                      kind="home-hero-mobile"
                    />
                  </div>
                </div>

                {/* Titles & Destination Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Alt Text / Heading (Tamil)
                    </label>
                    <input
                      type="text"
                      placeholder="எ.கா. சிறப்புச் சலுகை"
                      value={slide.alt_ta}
                      onChange={(e) => updateSlide(idx, { alt_ta: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Alt Text / Heading (English)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Special Offer"
                      value={slide.alt_en}
                      onChange={(e) => updateSlide(idx, { alt_en: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                      Click Destination Link
                    </label>
                    <input
                      type="text"
                      placeholder="/products or /products?category=..."
                      value={slide.link || ""}
                      onChange={(e) => updateSlide(idx, { link: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {slides.length < 6 && (
            <button
              type="button"
              onClick={addSlide}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-800 hover:border-red-500 hover:bg-red-50/20 text-xs font-bold text-gray-700 dark:text-neutral-300 transition-colors flex items-center justify-center gap-2"
            >
              <span>+ Add Another Banner Slide</span>
            </button>
          )}
        </div>
      ) : (
        /* TAB 2: PROMOTIONAL POPUP */
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">
                Storefront Promotional Popup
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Shows once per day to visitors with an attractive offer or announcement.
              </p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={popup.enabled}
                onChange={(e) => setPopup((p) => ({ ...p, enabled: e.target.checked }))}
                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <span className="text-sm font-bold text-gray-800 dark:text-neutral-200">
                {popup.enabled ? "Popup Enabled" : "Popup Disabled"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Title (Tamil)
                  </label>
                  <input
                    type="text"
                    value={popup.title_ta}
                    onChange={(e) => setPopup((p) => ({ ...p, title_ta: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    value={popup.title_en}
                    onChange={(e) => setPopup((p) => ({ ...p, title_en: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Message Text (Tamil)
                </label>
                <textarea
                  rows={2}
                  value={popup.text_ta}
                  onChange={(e) => setPopup((p) => ({ ...p, text_ta: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 p-2.5 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Message Text (English)
                </label>
                <textarea
                  rows={2}
                  value={popup.text_en}
                  onChange={(e) => setPopup((p) => ({ ...p, text_en: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 p-2.5 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Button Text (Tamil)
                  </label>
                  <input
                    type="text"
                    value={popup.button_ta || ""}
                    onChange={(e) => setPopup((p) => ({ ...p, button_ta: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                    Button Text (English)
                  </label>
                  <input
                    type="text"
                    value={popup.button_en || ""}
                    onChange={(e) => setPopup((p) => ({ ...p, button_en: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Button Link Destination
                </label>
                <input
                  type="text"
                  placeholder="/products"
                  value={popup.link || ""}
                  onChange={(e) => setPopup((p) => ({ ...p, link: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Popup Image & Live Preview */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/30 p-3.5 space-y-2">
                <p className="text-xs font-bold text-gray-800 dark:text-neutral-200">
                  Optional Popup Artwork
                </p>
                <ImageUploader
                  label="Popup Image"
                  ratio={[16, 9]}
                  targetWidth={800}
                  value={popup.image_url || ""}
                  onChange={(url) => setPopup((p) => ({ ...p, image_url: url }))}
                  kind="popup"
                />
              </div>

              {/* Mini Preview Box */}
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-4 shadow-md text-center space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Live Preview
                </p>
                {popup.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={popup.image_url}
                    alt="Preview"
                    className="h-28 w-full object-cover rounded-xl"
                  />
                )}
                <h3 className="text-sm font-bold text-gray-900 dark:text-neutral-100">
                  {popup.title_ta}
                </h3>
                <p className="text-xs text-gray-600 dark:text-neutral-400">
                  {popup.text_ta}
                </p>
                <span className="inline-block px-4 py-1.5 rounded-xl bg-[#E52320] text-white text-xs font-semibold">
                  {popup.button_ta || "பார்க்க"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {slides.filter((s) => s.active).length} of {slides.length} slides active on storefront
          </p>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-[#E52320] text-white hover:bg-[#c91e1b] transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
