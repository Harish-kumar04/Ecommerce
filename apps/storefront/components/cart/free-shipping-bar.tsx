"use client";

import { useLanguage } from "@/components/language-provider";

export const FREE_SHIPPING_THRESHOLD_CENTS = 50000; // Rs. 500

export default function FreeShippingBar({
  subtotalCents,
  className = "",
}: {
  subtotalCents: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const clamped = Math.max(0, subtotalCents || 0);
  const unlocked = clamped >= FREE_SHIPPING_THRESHOLD_CENTS;
  const remainingCents = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - clamped);
  const remainingRupees = Math.ceil(remainingCents / 100);
  const pct = Math.min(100, Math.round((clamped / FREE_SHIPPING_THRESHOLD_CENTS) * 100));

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-[13px] ${
        unlocked
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-black/10 bg-[#FAFAFA] text-black"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 font-semibold">
        <span>
          {unlocked
            ? t(
                "✓ வாழ்த்துகள்! உங்களுக்கு இலவச விநியோகம் கிடைத்துள்ளது",
                "✓ You've unlocked FREE pan-India delivery!",
              )
            : t(
                `மேலும் ₹${remainingRupees} சேர்த்தால் இலவச விநியோகம்!`,
                `Add ₹${remainingRupees} more for FREE delivery!`,
              )}
        </span>
        <span className="text-[11.5px] font-bold text-black/70">{pct}%</span>
      </div>

      <div
        role="progressbar"
        aria-label={t("இலவச விநியோக நிலை", "Free shipping progress")}
        aria-valuenow={Math.min(500, Math.round(clamped / 100))}
        aria-valuemin={0}
        aria-valuemax={500}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10"
      >
        <div
          style={{ width: `${pct}%` }}
          className={`h-full rounded-full transition-all duration-300 ${
            unlocked ? "bg-green-600" : "bg-brand-red"
          }`}
        />
      </div>
    </div>
  );
}
