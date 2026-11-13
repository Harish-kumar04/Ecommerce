"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/img";
import { toast } from "@/components/toaster";
import { useLanguage } from "@/components/language-provider";
import { storefrontApi } from "@/lib/api";
import { cloudinaryImageUrl } from "@/lib/site-defaults";
import PenLoader from "@/components/ui/pen-loader";
import FreeShippingBar from "@/components/cart/free-shipping-bar";

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
  cartItems?: any[];
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function CheckoutForm({
  tenant = "",
  razorpayEnabled = false,
  cartSubtotalCents = 0,
  cartItems = [],
  onSubmit,
  loading,
}: Props) {
  const { t, localizeName } = useLanguage();
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  // Optional gentle prefill if customer is logged in (never required for guest checkout)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem("store_access_token");
      if (!token) return;
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
          ? "/api/v1"
          : "http://localhost:8000/api/v1");
      fetch(`${apiBase.endsWith("/api/v1") ? apiBase : `${apiBase}/api/v1`}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tenant ? { "X-Tenant": tenant } : {}),
        },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => {
          if (!u) return;
          const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.full_name || "";
          if (name) setFullName((prev) => prev || name);
          if (u.email) setEmail((prev) => prev || u.email);
          if (u.phone) setPhone((prev) => prev || u.phone);
        })
        .catch(() => {});
    } catch {}
  }, [tenant]);

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
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = t("உங்கள் பெயரை உள்ளிடவும்", "Please enter your full name");
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      errs.phone = t("10 இலக்க அலைபேசி எண்ணை உள்ளிடவும்", "Enter a valid 10-digit phone number");
    }
    if (!address.trim()) {
      errs.address = t("விநியோக முகவரியை உள்ளிடவும்", "Please enter your street address");
    }
    if (!city.trim()) {
      errs.city = t("நகரம் / ஊர் பெயரை உள்ளிடவும்", "Please enter your city or town");
    }
    if (!/^[1-8]\d{5}$/.test(pincode.trim())) {
      errs.pincode = t("சரியான 6 இலக்க அஞ்சல் குறியீட்டை உள்ளிடவும்", "Enter a valid 6-digit Indian pincode");
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({
        kind: "error",
        title: t("விவரங்களைச் சரிபார்க்கவும்", "Please check highlighted fields"),
        description: Object.values(errs)[0],
      });
      return;
    }

    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || fullName.trim();
    const lastName = nameParts.slice(1).join(" ") || "";
    const resolvedEmail = email.trim() || `${digits}@guest.muthamilarignar.com`;
    const canonicalAddress = {
      line1: address.trim(),
      city: city.trim(),
      state: state.trim() || "Tamil Nadu",
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
  const freeShipping = appliedCoupon?.type === "free_shipping" || netSubtotalCents >= 50000;

  const inputCls = (hasErr?: boolean) =>
    `w-full h-12 px-4 border rounded-xl text-[14.5px] text-black bg-white placeholder:text-black/50 focus:outline-none focus:ring-2 ${
      hasErr
        ? "border-brand-red focus:border-brand-red focus:ring-brand-red/25"
        : "border-black/20 focus:border-brand-red focus:ring-brand-red/20"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
      {/* Left Column: Minimal Guest-Friendly Form + Payment Choices */}
      <div className="lg:col-span-7 space-y-6 rounded-2xl border border-black/10 bg-white p-6 sm:p-8 shadow-card">
        {/* Guest-friendly Reassurance */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.08] bg-[#FAFAFA] px-4 py-2.5 text-[12.5px] text-black/80">
          <span className="font-semibold">
            ✓ {t("கணக்குத் தொடங்கத் தேவையில்லை — விரைவு ஆர்டர்", "Guest checkout — no account required")}
          </span>
          <Link href={`/${tenant}/cart`} className="font-bold text-brand-red-dark hover:underline">
            {t("கூடையைத் திருத்து", "Edit cart")}
          </Link>
        </div>

        {/* 1. Contact Details */}
        <div>
          <h2 className="text-[17px] font-extrabold text-black mb-4">
            {t("1. தொடர்பு விவரங்கள்", "1. Contact Details")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chk-name" className="block text-[13px] font-bold text-black/85 mb-1.5">
                {t("முழுப் பெயர்", "Full Name")} *
              </label>
              <input
                id="chk-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: "" }));
                }}
                placeholder={t("உங்கள் பெயர்", "Your full name")}
                aria-invalid={Boolean(fieldErrors.fullName)}
                className={inputCls(Boolean(fieldErrors.fullName))}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="chk-phone" className="block text-[13px] font-bold text-black/85 mb-1.5">
                {t("அலைபேசி எண்", "Mobile Number")} *
              </label>
              <input
                id="chk-phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: "" }));
                }}
                placeholder="+91 98765 43210"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={inputCls(Boolean(fieldErrors.phone))}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="chk-email" className="block text-[13px] font-bold text-black/85 mb-1.5">
                {t("மின்னஞ்சல் முகவரி (விருப்பத்தேர்வு)", "Email Address (Optional)")}
              </label>
              <input
                id="chk-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls(false)}
              />
            </div>
          </div>
        </div>

        {/* 2. Delivery Address */}
        <div className="border-t border-black/[0.08] pt-6">
          <h2 className="text-[17px] font-extrabold text-black mb-4">
            {t("2. விநியோக முகவரி", "2. Delivery Address")}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="chk-address" className="block text-[13px] font-bold text-black/85 mb-1.5">
                {t("வீட்டு எண், தெரு முகவரி", "Door No., Street & Area")} *
              </label>
              <input
                id="chk-address"
                type="text"
                required
                autoComplete="street-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: "" }));
                }}
                placeholder={t("கதவு எண், தெரு பெயர், அடையாளம்", "Door No, Street Name, Landmark")}
                aria-invalid={Boolean(fieldErrors.address)}
                className={inputCls(Boolean(fieldErrors.address))}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="chk-pincode" className="block text-[13px] font-bold text-black/85 mb-1.5">
                  {t("அஞ்சல் குறியீடு", "Pincode")} *
                </label>
                <input
                  id="chk-pincode"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  autoComplete="postal-code"
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (fieldErrors.pincode) setFieldErrors((p) => ({ ...p, pincode: "" }));
                  }}
                  placeholder="600001"
                  aria-invalid={Boolean(fieldErrors.pincode)}
                  className={inputCls(Boolean(fieldErrors.pincode))}
                />
                {fieldErrors.pincode && (
                  <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{fieldErrors.pincode}</p>
                )}
              </div>

              <div>
                <label htmlFor="chk-city" className="block text-[13px] font-bold text-black/85 mb-1.5">
                  {t("நகரம் / ஊர்", "City / Town")} *
                </label>
                <input
                  id="chk-city"
                  type="text"
                  required
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    if (fieldErrors.city) setFieldErrors((p) => ({ ...p, city: "" }));
                  }}
                  placeholder="Chennai"
                  aria-invalid={Boolean(fieldErrors.city)}
                  className={inputCls(Boolean(fieldErrors.city))}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-[12px] font-semibold text-brand-red-dark">{fieldErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="chk-state" className="block text-[13px] font-bold text-black/85 mb-1.5">
                  {t("மாநிலம்", "State")} *
                </label>
                <input
                  id="chk-state"
                  type="text"
                  required
                  autoComplete="address-level1"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Tamil Nadu"
                  className={inputCls(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Payment Method */}
        <div className="border-t border-black/[0.08] pt-6">
          <h2 className="text-[17px] font-extrabold text-black mb-3">
            {t("3. பணம் செலுத்தும் முறை", "3. Payment Method")}
          </h2>
          <div className={`grid grid-cols-1 ${razorpayEnabled ? "sm:grid-cols-2" : ""} gap-3`}>
            {razorpayEnabled && (
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === "razorpay"
                    ? "border-brand-red bg-brand-red-light/40"
                    : "border-black/15 bg-white hover:border-black/35"
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
                  <span className="block text-[12px] text-black/70 mt-0.5">
                    {t("UPI, Google Pay, PhonePe, Cards, Net Banking", "UPI, Google Pay, PhonePe, Debit/Credit Cards")}
                  </span>
                </div>
              </label>
            )}

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === "cod"
                  ? "border-brand-red bg-brand-red-light/40"
                  : "border-black/15 bg-white hover:border-black/35"
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
                <span className="block text-[12px] text-black/70 mt-0.5">
                  {t("நூல் உங்கள் கைக்கு வந்தவுடன் பணம் செலுத்தலாம்", "Pay cash at your doorstep upon delivery")}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit CTA + Trust Line */}
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

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-medium text-black/70">
            <span>✓ {t("100% பாதுகாப்பான கட்டணம்", "100% Secure Checkout")}</span>
            <span>✓ {t("அதிகாரப்பூர்வப் பதிப்பகம்", "Official Publisher")}</span>
            <span>✓ {t("வாட்ஸ்அப் உதவி: 90033 24473", "WhatsApp Support: 90033 24473")}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Live Order Summary + Free-Shipping Progress + Coupon Box */}
      <aside className="lg:col-span-5 rounded-2xl border border-black/10 bg-[#FAFAFA] p-6 sm:p-7 lg:sticky lg:top-24 shadow-card space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-extrabold text-black">
            {t("ஆர்டர் சுருக்கம்", "Order Summary")}
          </h2>
          {cartItems.length > 0 && (
            <span className="text-[12.5px] font-semibold text-black/70">
              {cartItems.reduce((s, i) => s + (i.quantity ?? 1), 0)} {t("நூல்கள்", "books")}
            </span>
          )}
        </div>

        {cartSubtotalCents > 0 && <FreeShippingBar subtotalCents={netSubtotalCents} />}

        {/* Live Cart Items Preview */}
        {cartItems.length > 0 && (
          <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.08] pr-1">
            {cartItems.map((it: any) => {
              const name = it.name || it.product?.name || "Book";
              const rawImg =
                it.image_url || it.product?.image_url || it.product?.images?.[0] || null;
              const img = rawImg ? cloudinaryImageUrl(rawImg, 160) : null;
              const unit =
                it.unit_price_cents ??
                it.price_cents ??
                it.product?.sale_price_cents ??
                it.product?.price_cents ??
                0;
              const line = it.line_total_cents ?? unit * (it.quantity ?? 1);

              return (
                <div key={it.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white">
                    {img ? (
                      <Image
                        src={img}
                        alt={localizeName(name)}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13.5px] font-bold text-black">
                      {localizeName(name)}
                    </p>
                    <p className="text-[12px] text-black/65">
                      {t("எண்ணிக்கை", "Qty")}: {it.quantity ?? 1}
                    </p>
                  </div>
                  <span className="text-[14px] font-extrabold text-black whitespace-nowrap">
                    ₹{(line / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Coupon Box */}
        <div className="border-t border-black/10 pt-4">
          <label htmlFor="chk-coupon" className="block text-[12.5px] font-bold text-black/80 mb-1.5">
            {t("தள்ளுபடி கூப்பன்", "Discount Coupon")}
          </label>
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3.5 py-2.5 text-[13.5px]">
              <div>
                <span className="font-bold text-green-900">{appliedCoupon.code}</span>
                <span className="ml-2 text-green-800">
                  {appliedCoupon.type === "free_shipping"
                    ? t("இலவச அஞ்சல்", "Free shipping")
                    : `−₹${(discountCents / 100).toFixed(2)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="min-h-[36px] px-2 text-[12.5px] font-bold text-brand-red-dark hover:underline"
              >
                {t("நீக்கு", "Remove")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                id="chk-coupon"
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  if (couponError) setCouponError(null);
                }}
                placeholder={t("கூப்பன் குறியீடு (எ.கா. SAVE10)", "Enter coupon code")}
                className="flex-1 h-11 px-4 border border-black/20 bg-white rounded-full text-[13.5px] text-black uppercase placeholder:normal-case placeholder:text-black/55 focus:border-brand-red focus:outline-none"
              />
              <button
                type="button"
                disabled={couponLoading}
                aria-busy={couponLoading || undefined}
                onClick={handleApplyCoupon}
                className="h-11 px-5 rounded-full bg-black text-white text-[13px] font-bold hover:bg-brand-red-dark disabled:opacity-60 inline-flex items-center justify-center"
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
            <p className="mt-1.5 text-[12.5px] font-semibold text-brand-red-dark">{couponError}</p>
          )}
        </div>

        {/* Totals Breakdown */}
        <div className="border-t border-black/10 pt-4 space-y-2 text-[14px]">
          <div className="flex justify-between text-black/75">
            <span>{t("நூல்களின் விலை", "Items Subtotal")}</span>
            <span className="font-semibold text-black">₹{(cartSubtotalCents / 100).toFixed(2)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-green-800 font-semibold">
              <span>
                {t("தள்ளுபடி", "Coupon Discount")} ({appliedCoupon?.code})
              </span>
              <span>−₹{(discountCents / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-black/75">
            <span>{t("விநியோகக் கட்டணம்", "Delivery")}</span>
            <span className="font-semibold text-black">
              {freeShipping ? t("இலவசம் (₹0)", "FREE (₹0)") : t("விதிமுறைப்படி", "Standard")}
            </span>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-3 text-[19px] font-extrabold text-black">
            <span>{t("செலுத்த வேண்டிய தொகை", "Order Total")}</span>
            <span className="text-brand-red">₹{(netSubtotalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </aside>
    </form>
  );
}
