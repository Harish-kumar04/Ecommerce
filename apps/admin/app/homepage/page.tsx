"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import ImageUploader from "@/components/image-uploader";
import Image from "next/image";

interface Slide {
  id: string;
  image_url: string;
  mobile_image_url?: string;
  alt_ta: string;
  alt_en: string;
  link?: string;
  active: boolean;
  starts_at?: string;
  ends_at?: string;
}

interface NotificationItem {
  id: string;
  type: "popup" | "bar";
  image_url?: string;
  title_ta: string;
  title_en: string;
  text_ta: string;
  text_en: string;
  button_ta?: string;
  button_en?: string;
  link?: string;
  active: boolean;
  starts_at?: string;
  ends_at?: string;
  delay_seconds: number;
  frequency: "once" | "daily" | "every_visit";
  pages: "home" | "all";
}

export default function HomepageOffersPage() {
  const [tab, setTab] = useState<"slides" | "notifications">("slides");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Slide modal / edit state
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);

  // Notification modal / edit state
  const [editingNotification, setEditingNotification] = useState<NotificationItem | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await adminApi.getStoreSettings();
        setSettings(res);
        const tc = res?.theme_config || res?.store?.theme_config || {};
        if (Array.isArray(tc.home_slides)) {
          setSlides(tc.home_slides);
        }
        if (Array.isArray(tc.notifications)) {
          setNotifications(tc.notifications);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load store settings");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const handleSaveAll = async (newSlides = slides, newNotifs = notifications) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const currentTc = settings?.theme_config || settings?.store?.theme_config || {};
      const updatedTc = {
        ...currentTc,
        home_slides: newSlides,
        notifications: newNotifs,
      };

      await adminApi.updateStoreSettings({
        theme_config: updatedTc,
      });

      setSlides(newSlides);
      setNotifications(newNotifs);
      setMessage("Homepage & offers settings saved successfully!");
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reorder slides
  const moveSlide = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const next = [...slides];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSlides(next);
    void handleSaveAll(next, notifications);
  };

  const deleteSlide = (id: string) => {
    if (!confirm("Are you sure you want to delete this offer slide?")) return;
    const next = slides.filter((s) => s.id !== id);
    setSlides(next);
    void handleSaveAll(next, notifications);
  };

  const toggleSlideActive = (id: string) => {
    const next = slides.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    setSlides(next);
    void handleSaveAll(next, notifications);
  };

  const saveSlideModal = () => {
    if (!editingSlide) return;
    if (!editingSlide.image_url) {
      alert("Desktop image is required for an offer slide.");
      return;
    }

    let next: Slide[];
    const exists = slides.some((s) => s.id === editingSlide.id);
    if (exists) {
      next = slides.map((s) => (s.id === editingSlide.id ? editingSlide : s));
    } else {
      if (slides.length >= 6) {
        alert("Maximum of 6 offer slides allowed. Please delete or disable an existing slide.");
        return;
      }
      next = [...slides, editingSlide];
    }

    setSlides(next);
    setIsSlideModalOpen(false);
    setEditingSlide(null);
    void handleSaveAll(next, notifications);
  };

  // Notification actions
  const toggleNotifActive = (id: string) => {
    const next = notifications.map((n) => (n.id === id ? { ...n, active: !n.active } : n));
    setNotifications(next);
    void handleSaveAll(slides, next);
  };

  const deleteNotification = (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    const next = notifications.filter((n) => n.id !== id);
    setNotifications(next);
    void handleSaveAll(slides, next);
  };

  const saveNotifModal = () => {
    if (!editingNotification) return;
    let next: NotificationItem[];
    const exists = notifications.some((n) => n.id === editingNotification.id);
    if (exists) {
      next = notifications.map((n) => (n.id === editingNotification.id ? editingNotification : n));
    } else {
      next = [...notifications, editingNotification];
    }
    setNotifications(next);
    setIsNotifModalOpen(false);
    setEditingNotification(null);
    void handleSaveAll(slides, next);
  };

  const activeNotifsCount = notifications.filter((n) => n.active).length;

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Loading Homepage & Offers settings…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage & Offers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage scrolling hero offer images and promotional popups / top notification bars.
          </p>
        </div>
        <button
          onClick={() => handleSaveAll()}
          disabled={saving}
          className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setTab("slides")}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === "slides" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Scrolling Images ({slides.length}/6)
        </button>
        <button
          onClick={() => setTab("notifications")}
          className={`pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
            tab === "notifications" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Notifications & Popups ({notifications.length})
        </button>
      </div>

      {/* TAB 1: SCROLLING IMAGES */}
      {tab === "slides" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-bold text-gray-800">Scrolling Hero Offers</p>
              <p className="text-xs text-gray-500">
                Displays 1920×720 (8:3) banner slides on the storefront. Up to 6 active slides supported.
              </p>
            </div>
            <button
              onClick={() => {
                if (slides.length >= 6) {
                  alert("Maximum 6 slides reached. Please delete or disable an existing slide first.");
                  return;
                }
                setEditingSlide({
                  id: "slide_" + Date.now(),
                  image_url: "",
                  alt_ta: "சிறப்புச் சலுகை",
                  alt_en: "Special Offer",
                  link: "/products",
                  active: true,
                });
                setIsSlideModalOpen(true);
              }}
              disabled={slides.length >= 6}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              + Add Offer Image
            </button>
          </div>

          {slides.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-sm font-medium text-gray-600">No custom offer slides added yet.</p>
              <p className="text-xs text-gray-400 mt-1">The storefront is currently displaying the 3 built-in brand slides.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slides.map((s, idx) => (
                <div
                  key={s.id}
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-white shadow-sm transition-all ${
                    s.active ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                    <div className="relative h-16 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                      {s.image_url ? (
                        <Image src={s.image_url} alt={s.alt_en} fill sizes="144px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{s.alt_en || s.alt_ta || "Slide"}</p>
                      <p className="truncate text-xs text-gray-500 font-mono">{s.link || "No link"}</p>
                      {(s.starts_at || s.ends_at) && (
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                          Schedule: {s.starts_at ? new Date(s.starts_at).toLocaleDateString() : "Now"} –{" "}
                          {s.ends_at ? new Date(s.ends_at).toLocaleDateString() : "Forever"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSlideActive(s.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.active ? "Active" : "Disabled"}
                    </button>

                    {/* Up / Down reorder */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlide(idx, "up")}
                      className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={() => moveSlide(idx, "down")}
                      className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                      title="Move Down"
                    >
                      ▼
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlide({ ...s });
                        setIsSlideModalOpen(true);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => deleteSlide(s.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="space-y-6">
          {activeNotifsCount > 3 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
              ⚠️ Warning: You have {activeNotifsCount} active notifications. To ensure a fast and uncluttered experience, we recommend having no more than 3 active notifications at the same time.
            </div>
          )}

          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-bold text-gray-800">Store Notifications & Promotional Popups</p>
              <p className="text-xs text-gray-500">Configure promotional popups or announcement bars with scheduling and frequency controls.</p>
            </div>
            <button
              onClick={() => {
                setEditingNotification({
                  id: "notif_" + Date.now(),
                  type: "popup",
                  title_ta: "புதிய வெளியீடுகள்!",
                  title_en: "Special Announcement!",
                  text_ta: "முத்தமிழறிஞர் பதிப்பகத்தின் புதிய நூல்கள் இப்போது கிடைக்கின்றன.",
                  text_en: "Explore new titles from Muthamilarignar Pathipagam.",
                  button_ta: "நூல்களைக் காண்க",
                  button_en: "Explore Books",
                  link: "/products",
                  active: true,
                  delay_seconds: 4,
                  frequency: "daily",
                  pages: "home",
                });
                setIsNotifModalOpen(true);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              + Add Notification
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-sm font-medium text-gray-600">No notifications configured.</p>
              <p className="text-xs text-gray-400 mt-1">Add a top announcement bar or promotional popup to engage readers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-white shadow-sm transition-all ${
                    n.active ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        n.type === "bar" ? "bg-black text-white" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {n.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {n.title_en || n.title_ta || "Notification"}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-md">{n.text_en || n.text_ta}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                        <span>Frequency: <strong className="text-gray-700">{n.frequency}</strong></span>
                        <span>•</span>
                        <span>Pages: <strong className="text-gray-700">{n.pages}</strong></span>
                        {n.delay_seconds > 0 && (
                          <>
                            <span>•</span>
                            <span>Delay: <strong className="text-gray-700">{n.delay_seconds}s</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleNotifActive(n.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        n.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {n.active ? "Active" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotification({ ...n });
                        setIsNotifModalOpen(true);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SLIDE EDIT MODAL */}
      {isSlideModalOpen && editingSlide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Edit Offer Slide</h2>

            {/* Desktop Image */}
            <ImageUploader
              label="Desktop Banner Image"
              ratio={[8, 3]}
              targetWidth={1920}
              value={editingSlide.image_url}
              onChange={(url) => setEditingSlide({ ...editingSlide, image_url: url })}
              kind="slides"
              required
            />

            {/* Mobile Image (Optional) */}
            <ImageUploader
              label="Mobile Banner Image (Optional, 4:5)"
              ratio={[4, 5]}
              targetWidth={1080}
              value={editingSlide.mobile_image_url || ""}
              onChange={(url) => setEditingSlide({ ...editingSlide, mobile_image_url: url })}
              kind="slides"
            />

            {/* Alt Texts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alt Text (Tamil)</label>
                <input
                  type="text"
                  value={editingSlide.alt_ta}
                  onChange={(e) => setEditingSlide({ ...editingSlide, alt_ta: e.target.value })}
                  placeholder="சிறப்பு வெளியீடு"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alt Text (English)</label>
                <input
                  type="text"
                  value={editingSlide.alt_en}
                  onChange={(e) => setEditingSlide({ ...editingSlide, alt_en: e.target.value })}
                  placeholder="Special Publication"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Button / Destination Link</label>
              <input
                type="text"
                value={editingSlide.link || ""}
                onChange={(e) => setEditingSlide({ ...editingSlide, link: e.target.value })}
                placeholder="/products?category=kalaignar-works"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={editingSlide.starts_at ? editingSlide.starts_at.slice(0, 16) : ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, starts_at: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={editingSlide.ends_at ? editingSlide.ends_at.slice(0, 16) : ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, ends_at: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Active Switch */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editingSlide.active}
                onChange={(e) => setEditingSlide({ ...editingSlide, active: e.target.checked })}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-semibold text-gray-800">Slide is Active</span>
            </label>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSlideModalOpen(false);
                  setEditingSlide(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSlideModal}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Save Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION EDIT MODAL & LIVE PREVIEW */}
      {isNotifModalOpen && editingNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-3">Edit Notification / Popup</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Controls */}
              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notification Type</label>
                  <select
                    value={editingNotification.type}
                    onChange={(e) => setEditingNotification({ ...editingNotification, type: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="popup">Promotional Popup (Modal)</option>
                    <option value="bar">Top Announcement Bar</option>
                  </select>
                </div>

                {/* Optional Image for Popup */}
                {editingNotification.type === "popup" && (
                  <ImageUploader
                    label="Popup Image (4:5)"
                    ratio={[4, 5]}
                    targetWidth={800}
                    value={editingNotification.image_url || ""}
                    onChange={(url) => setEditingNotification({ ...editingNotification, image_url: url })}
                    kind="notifications"
                  />
                )}

                {/* Titles */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Title (Tamil)</label>
                    <input
                      type="text"
                      value={editingNotification.title_ta}
                      onChange={(e) => setEditingNotification({ ...editingNotification, title_ta: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Title (English)</label>
                    <input
                      type="text"
                      value={editingNotification.title_en}
                      onChange={(e) => setEditingNotification({ ...editingNotification, title_en: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Text */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Text (Tamil)</label>
                    <textarea
                      rows={2}
                      value={editingNotification.text_ta}
                      onChange={(e) => setEditingNotification({ ...editingNotification, text_ta: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Text (English)</label>
                    <textarea
                      rows={2}
                      value={editingNotification.text_en}
                      onChange={(e) => setEditingNotification({ ...editingNotification, text_en: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Button & Link */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={editingNotification.button_en || ""}
                      onChange={(e) => setEditingNotification({ ...editingNotification, button_en: e.target.value })}
                      placeholder="Shop now"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Destination Link</label>
                    <input
                      type="text"
                      value={editingNotification.link || ""}
                      onChange={(e) => setEditingNotification({ ...editingNotification, link: e.target.value })}
                      placeholder="/products"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Frequency & Pages */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency</label>
                    <select
                      value={editingNotification.frequency}
                      onChange={(e) => setEditingNotification({ ...editingNotification, frequency: e.target.value as any })}
                      className="w-full border rounded-lg px-2 py-2 text-xs bg-white"
                    >
                      <option value="daily">Once a day</option>
                      <option value="once">Once only</option>
                      <option value="every_visit">Every visit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Pages</label>
                    <select
                      value={editingNotification.pages}
                      onChange={(e) => setEditingNotification({ ...editingNotification, pages: e.target.value as any })}
                      className="w-full border rounded-lg px-2 py-2 text-xs bg-white"
                    >
                      <option value="home">Home only</option>
                      <option value="all">All pages</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Delay (sec)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingNotification.delay_seconds}
                      onChange={(e) => setEditingNotification({ ...editingNotification, delay_seconds: Number(e.target.value) })}
                      className="w-full border rounded-lg px-2 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Preview</p>
                {editingNotification.type === "bar" ? (
                  <div className="rounded-lg bg-red-600 text-white p-3 text-xs flex items-center justify-between shadow-sm">
                    <div className="truncate">
                      <strong>{editingNotification.title_en || editingNotification.title_ta}:</strong>{" "}
                      <span>{editingNotification.text_en || editingNotification.text_ta}</span>
                      {editingNotification.button_en && (
                        <span className="ml-2 font-bold underline cursor-pointer">{editingNotification.button_en} →</span>
                      )}
                    </div>
                    <span className="text-white/80 text-sm font-bold">×</span>
                  </div>
                ) : (
                  <div className="max-w-xs mx-auto rounded-xl bg-white border shadow-md overflow-hidden text-center">
                    {editingNotification.image_url ? (
                      <div className="relative aspect-[4/5] w-full bg-gray-100">
                        <Image src={editingNotification.image_url} alt="Preview" fill sizes="320px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        Optional Image (4:5)
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <p className="font-bold text-sm text-gray-900">{editingNotification.title_en || editingNotification.title_ta}</p>
                      <p className="text-xs text-gray-600 leading-snug">{editingNotification.text_en || editingNotification.text_ta}</p>
                      {editingNotification.button_en && (
                        <button className="w-full rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white mt-2">
                          {editingNotification.button_en}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsNotifModalOpen(false);
                  setEditingNotification(null);
                }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNotifModal}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Save Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
