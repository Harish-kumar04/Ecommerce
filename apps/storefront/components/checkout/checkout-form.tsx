"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/toaster";
import { useLanguage } from "@/components/language-provider";
import { storefrontApi } from "@/lib/api";
import PenLoader from "@/components/ui/pen-loader";

interface AppliedCoupon {
  code: string;
  type: string;
  value: number;
  discount_cents: number;
}

interface Props {
  tenant?: string;
  razorpayEnabled?: boolean;
  cartSubtotalCents?: number;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function CheckoutForm({
  tenant = "",
  razorpayEnabled = false,
  cartSubtotalCents = 0,
  onSubmit,
  loading,
}: Props) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">(
    razorpayEnabled ? "razorpay" : "cod",
  );

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const couponStorageKey = tenant ? `store_applied_coupon_${tenant}` : "store_applied_coupon";

  useEffect(() => {
    if (!razorpayEnabled && paymentMethod === "razorpay") {
      setPaymentMethod("cod");
    }
  }, [razorpayEnabled, paymentMethod]);

  useEffect(() => {
    if (typeof window === "undefined" || !tenant) return;
    try {
      const savedRaw = localStorage.getItem(couponStorageKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved?.code) {
          setCouponInput(saved.code);
          if (cartSubtotalCents > 0) {
            storefrontApi
              .validateCoupon(tenant, saved.code, cartSubtotalCents)
              .then((verified) => {
                const next: AppliedCoupon = {
                  code: verified.code,
                  type: verified.type,
                  value: verified.value,
                  discount_cents: verified.discount_cents ?? 0,
                };
                setAppliedCoupon(next);
                localStorage.setItem(couponStorageKey, JSON.stringify(next));
              })
              .catch(() => {
                setAppliedCoupon(null);
                localStorage.removeItem(couponStorageKey);
              });
          } else {
            setAppliedCoupon(saved);
          }
        }
      }
    } catch {}
  }, [tenant, cartSubtotalCents, couponStorageKey]);

  const handleApplyCoupon = async () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      setCouponError(t("கூப்பன் குறியீட்டை உள்ளிடவும்", "Please enter a coupon code"));
      return;
    }
    if (!tenant) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await storefrontApi.validateCoupon(tenant, clean, cartSubtotalCents);
      const next: AppliedCoupon = {
        code: res.code,
        type: res.type,
        value: res.value,
        discount_cents: res.discount_cents ?? 0,
      };
      setAppliedCoupon(next);
      setCouponInput(res.code);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(couponStorageKey, JSON.stringify(next));
        } catch {}
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message || t("தவறான கூப்பன்", "Invalid coupon code"));
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(couponStorageKey);
        } catch {}
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(couponStorageKey);
      } catch {}
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !address.trim() || !city.trim() || !pincode.trim()) {
      toast({
        kind: "error",
        title: t("விவரங்களை நிரப்பவும்", "Required fields missing"),
        description: t("அனைத்து நட்சத்திரக் குறியிட்ட புலங்களையும் நிரப்பவும்", "Please fill in all required fields"),
      });
      return;
    }

    if (pincode.trim().length !== 6 || isNaN(Number(pincode))) {
      toast({
        kind: "error",
        title: t("தவறான அஞ்சல் குறியீடு", "Invalid Pincode"),
        description: t("6 இலக்க சரியான அஞ்சல் குறியீட்டை உள்ளிடவும்", "Please enter a valid 6-digit pincode"),
      });
      return;
    }

    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || fullName.trim();
    const lastName = nameParts.slice(1).join(" ") || "";
    const resolvedEmail = email.trim() || `${phone.replace(/\D/g, "")}@guest.muthamilarignar.com`;
    const canonicalAddress = {
      line1: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: "India",
      postal_code: pincode.trim(),
      name: fullName.trim(),
      phone: phone.trim(),
      email: resolvedEmail,
    };

    onSubmit({
      customer: {
        email: resolvedEmail,
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim(),
      },
      shipping: canonicalAddress,
      billing: canonicalAddress,
      discount_codes: appliedCoupon ? [appliedCoupon.code] : [],
      payment_provider: razorpayEnabled ? paymentMethod : "cod",
    });
  };

  const discountCents = appliedCoupon
    ? Math.min(appliedCoupon.discount_cents || 0, cartSubtotalCents || Number.MAX_SAFE_INTEGER)
    : 0;
  const netSubtotalCents = Math.max(cartSubtotalCents - discountCents, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-black/10 shadow-sm">
      {/* 1. Contact Info */}
      <div>
        <h2 className="text-[17px] font-bold text-black mb-4">
          {t("1. தொடர்பு விவரங்கள்", "1. Contact Information")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
              {t("முழுப் பெயர்", "Full Name")} *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("உங்கள் பெயர்", "Your full name")}
              className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
              {t("அலைபேசி எண்", "Phone Number")} *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
              {t("மின்னஞ்சல் முகவரி (விருப்பத்தேர்வு)", "Email Address (Optional)")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
            <p className="text-[11.5px] text-black/50 mt-1">
              {t("ஆர்டர் உறுதிப்படுத்தல் தகவல் அனுப்பப்படும்", "Order confirmation will be sent here")}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Shipping Address */}
      <div className="border-t border-black/[0.08] pt-6">
        <h2 className="text-[17px] font-bold text-black mb-4">
          {t("2. விநியோக முகவரி", "2. Shipping Address")}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
              {t("வீட்டு எண், தெரு முகவரி", "Street Address / Door No.")} *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("கதவு எண், தெரு பெயர், பகுதி", "Door No, Street Name, Area / Landmark")}
              className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
                {t("நகரம் / ஊர்", "City / Town")} *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chennai"
                className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
                {t("மாநிலம்", "State")} *
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Tamil Nadu"
                className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-black/80 mb-1.5">
                {t("அஞ்சல் குறியீடு", "Pincode")} *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="600001"
                className="w-full h-12 px-4 border border-black/20 rounded-xl text-[14.5px] text-black focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Coupon Box & Summary */}
      <div className="border-t border-black/[0.08] pt-6">
        <h2 className="text-[17px] font-bold text-black mb-3">
          {t("3. தள்ளுபடி கூப்பன்", "3. Discount Coupon")}
        </h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[14px]">
            <div>
              <span className="font-bold text-green-800">{appliedCoupon.code}</span>
              <span className="ml-2 text-green-700">
                {appliedCoupon.type === "free_shipping"
                  ? t("இலவச அஞ்சல் பயன்பாட்டில் உள்ளது", "Free shipping applied")
                  : `-₹${(discountCents / 100).toFixed(2)}`}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-[13px] font-semibold text-brand-red hover:underline"
            >
              {t("நீக்கு", "Remove")}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                if (couponError) setCouponError(null);
              }}
              placeholder={t("கூப்பன் குறியீடு (எ.கா. SAVE10)", "Enter coupon code")}
              className="flex-1 h-11 px-4 border border-black/20 rounded-xl text-[14px] text-black uppercase focus:border-brand-red focus:outline-none"
            />
            <button
              type="button"
              disabled={couponLoading}
              aria-busy={couponLoading || undefined}
              onClick={handleApplyCoupon}
              className="h-11 px-5 rounded-xl bg-black text-white text-[13.5px] font-semibold hover:bg-black/85 disabled:opacity-60 inline-flex items-center justify-center"
            >
              {couponLoading ? (
                <PenLoader size="sm" tone="light" label="Applying coupon" />
              ) : (
                t("பயன்படுத்து", "Apply")
              )}
            </button>
          </div>
        )}
        {couponError && (
          <p className="mt-1.5 text-[12.5px] text-brand-red">{couponError}</p>
        )}
        {cartSubtotalCents > 0 && (
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200/70 p-4 text-[13.5px] space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>{t("நூல்களின் விலை", "Items Subtotal")}</span>
              <span>₹{(cartSubtotalCents / 100).toFixed(2)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-green-700 font-medium">
                <span>{t("தள்ளுபடி", "Coupon Discount")} ({appliedCoupon?.code})</span>
                <span>−₹{(discountCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
              <span>{t("தள்ளுபடிக்குப் பின்", "Subtotal after discount")}</span>
              <span>₹{(netSubtotalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Payment Method */}
      <div className="border-t border-black/[0.08] pt-6">
        <h2 className="text-[17px] font-bold text-black mb-3">
          {t("4. பணம் செலுத்தும் முறை", "4. Payment Method")}
        </h2>
        <div className={`grid grid-cols-1 ${razorpayEnabled ? "sm:grid-cols-2" : ""} gap-3`}>
          {razorpayEnabled && (
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === "razorpay"
                  ? "border-brand-red bg-brand-red-light/40"
                  : "border-black/15 bg-white hover:border-black/30"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="razorpay"
                checked={paymentMethod === "razorpay"}
                onChange={() => setPaymentMethod("razorpay")}
                className="mt-1 h-4 w-4 text-brand-red focus:ring-brand-red"
              />
              <div>
                <span className="block text-[14.5px] font-bold text-black">
                  {t("ஆன்லைன் கட்டணம் (Razorpay)", "Online Payment (Razorpay)")}
                </span>
                <span className="block text-[12px] text-black/60 mt-0.5">
                  {t("UPI, Google Pay, PhonePe, Cards, Net Banking", "UPI, Google Pay, PhonePe, Debit/Credit Cards")}
                </span>
              </div>
            </label>
          )}

          {/* Cash on Delivery */}
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              paymentMethod === "cod"
                ? "border-brand-red bg-brand-red-light/40"
                : "border-black/15 bg-white hover:border-black/30"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="mt-1 h-4 w-4 text-brand-red focus:ring-brand-red"
            />
            <div>
              <span className="block text-[14.5px] font-bold text-black">
                {t("ரொக்கப் பணம் (Cash on Delivery)", "Cash on Delivery (COD)")}
              </span>
              <span className="block text-[12px] text-black/60 mt-0.5">
                {t("நூல் கிடைத்தவுடன் பணம் செலுத்தலாம்", "Pay cash when books are delivered")}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-red h-14 w-full text-[16px] font-bold shadow-glow"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <PenLoader size="sm" tone="light" label={t("ஆர்டர் செய்யப்படுகிறது", "Processing Order")} />
              {t("ஆர்டர் செய்யப்படுகிறது…", "Processing Order…")}
            </span>
          ) : (
            t("ஆர்டரை உறுதிப்படுத்துக", "Place Order Now")
          )}
        </button>
        <p className="text-[11.5px] text-center text-black/50 mt-2">
          {t("100% பாதுகாப்பான பரிவர்த்தனை • உடனடி வாட்ஸ்அப் உதவி", "100% Secure Checkout • Instant WhatsApp Support")}
        </p>
      </div>
    </form>
  );
}
