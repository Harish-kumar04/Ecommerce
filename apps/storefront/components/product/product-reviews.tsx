"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified?: boolean;
};

const DEMO_REVIEWS: Review[] = [
  {
    id: "r1",
    name: "செந்தில் குமார் / Senthil Kumar",
    rating: 5,
    title: "வரலாற்றுச் சிறப்புமிக்க நூல் | A Must-Read Historical Volume",
    body: "திராவிட இயக்க வரலாற்றையும் சமூகநீதிப் போராட்டங்களையும் ஆதாரங்களுடன் தெளிவாகப் பதிவு செய்துள்ள மிகச்சிறந்த நூல். அச்சுத் தரமும் வடிவமைப்பும் அருமை.",
    date: "2025-10-15",
    verified: true,
  },
  {
    id: "r2",
    name: "கவிதா இராமசாமி / Kavitha R.",
    rating: 5,
    title: "இளைய தலைமுறை அவசியம் படிக்க வேண்டிய புத்தகம்",
    body: "முத்தமிழறிஞர் பதிப்பகத்தின் வெளியீடுகள் அனைத்தும் மிக நேர்த்தியாக உள்ளன. விரைவான கூரியர் டெலிவரி மற்றும் பாதுகாப்பான பேக்கிங்.",
    date: "2025-09-22",
    verified: true,
  },
  {
    id: "r3",
    name: "Arunachalam M.",
    rating: 5,
    title: "Authentic edition from Muthamilarignar Pathipagam",
    body: "Excellent print quality and binding. Essential reading for anyone interested in Tamil Nadu's political history, social justice, and Kalaignar's literary legacy.",
    date: "2025-08-19",
    verified: true,
  },
];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill={i <= value ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 ${
            i <= value ? "text-amber-500" : "text-gray-300 dark:text-neutral-700"
          }`}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ProductReviews({
  product,
  tenant,
}: {
  product: any;
  tenant: string;
}) {
  const { t } = useLanguage();
  const storageKey = `mp-reviews:${tenant}:${product.id}`;
  const [reviews, setReviews] = useState<Review[]>(() => {
    if (typeof window === "undefined") return DEMO_REVIEWS;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return [...DEMO_REVIEWS, ...stored];
    } catch {
      return DEMO_REVIEWS;
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const histogram = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !title || !body) return;
    const newReview: Review = {
      id: `local-${Date.now()}`,
      name,
      title,
      body,
      rating,
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      localStorage.setItem(storageKey, JSON.stringify([newReview, ...stored]));
    } catch {
      /* ignore quota */
    }
    setReviews([newReview, ...reviews]);
    setSubmitted(true);
    setName("");
    setTitle("");
    setBody("");
    setRating(5);
    setTimeout(() => setSubmitted(false), 2500);
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 border-t border-gray-100 dark:border-neutral-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            {t("வாசகர் கருத்துக்கள்", "Reader Reviews")}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-[14px] text-gray-500 dark:text-neutral-400">
            <Stars value={Math.round(avg)} />
            <span>
              {avg.toFixed(1)} / 5 ({reviews.length}{" "}
              {t("மதிப்புரைகள்", "reviews")})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors"
        >
          {showForm
            ? t("மூடுக", "Close")
            : t("மதிப்புரை எழுதுக", "Write a Review")}
        </button>
      </div>

      {/* Histogram */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          {histogram.map((h) => (
            <div key={h.stars} className="flex items-center gap-3 text-[13px]">
              <span className="w-8 text-gray-500 dark:text-neutral-500">
                {h.stars} ★
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-900 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${(h.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-gray-500 dark:text-neutral-500">
                {h.count}
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={submit} className="space-y-3">
            {submitted && (
              <p className="text-[13px] text-green-600 dark:text-green-400">
                {t(
                  "நன்றி — உங்கள் கருத்து பதிவு செய்யப்பட்டது.",
                  "Thank you — your review has been posted.",
                )}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("உங்கள் பெயர்", "Your name")}
                className="h-10 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-[14px]"
                required
              />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setRating(i)}
                    className="p-1"
                    aria-label={`${i} stars`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={i <= rating ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`w-5 h-5 ${
                        i <= rating
                          ? "text-amber-500"
                          : "text-gray-300 dark:text-neutral-700"
                      }`}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("மதிப்புரை தலைப்பு", "Review title")}
              className="w-full h-10 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-[14px]"
              required
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t(
                "இந்நூல் குறித்த உங்கள் கருத்தைப் பகிரவும்…",
                "Share your thoughts about this book…",
              )}
              rows={4}
              className="w-full rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-[14px]"
              required
            />
            <button
              type="submit"
              className="inline-flex h-10 px-5 items-center justify-center rounded-full bg-red-600 text-white text-[14px] font-semibold hover:bg-red-700 transition-colors"
            >
              {t("பதிவு செய்க", "Post Review")}
            </button>
          </form>
        )}
      </div>

      {/* Review list */}
      <div className="mt-10 space-y-6">
        {reviews.map((r) => (
          <article
            key={r.id}
            className="border-b border-gray-100 dark:border-neutral-900 pb-6 last:border-0"
          >
            <div className="flex items-center gap-2">
              <Stars value={r.rating} />
              <span className="text-[14px] font-semibold text-gray-900 dark:text-neutral-100">
                {r.title}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-gray-700 dark:text-neutral-300 leading-relaxed">
              {r.body}
            </p>
            <p className="mt-3 text-[12px] text-gray-500 dark:text-neutral-500">
              {r.name} · {r.date}
              {r.verified
                ? ` · ${t("உறுதிசெய்யப்பட்ட வாசகர்", "Verified Reader")}`
                : ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}