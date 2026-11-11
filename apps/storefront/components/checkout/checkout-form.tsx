"use client";

import { useState } from "react";
import { toast } from "@/components/toaster";
import { useLanguage } from "@/components/language-provider";

interface Props {
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function CheckoutForm({ onSubmit, loading }: Props) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");

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

    onSubmit({
      customer: {
        email: email.trim() || `${phone.replace(/\D/g, "")}@guest.muthamilarignar.com`,
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim(),
      },
      shipping: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: "India",
        pincode: pincode.trim(),
        phone: phone.trim(),
      },
      billing: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: "India",
        pincode: pincode.trim(),
      },
      discount_codes: [],
      payment_provider: paymentMethod,
    });
  };

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

      {/* 3. Payment Method: Razorpay + Cash on Delivery only */}
      <div className="border-t border-black/[0.08] pt-6">
        <h2 className="text-[17px] font-bold text-black mb-3">
          {t("3. பணம் செலுத்தும் முறை", "3. Payment Method")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Razorpay (Default) */}
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
          className="btn-red h-14 w-full text-[16px] font-bold shadow-glow"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("ஆர்டர் செய்யப்படுகிறது…", "Processing Order…")}
            </span>
          ) : (
            t("ஆர்டரை உறுதிப்படுத்துக", "Place Order Now")
          )}
        </button>
        <p className="text-[11.5px] text-center text-black/50 mt-2">
          🔒 {t("100% பாதுகாப்பான பரிவர்த்தனை • உடனடி வாட்ஸ்அப் உதவி", "100% Secure Checkout • Instant WhatsApp Support")}
        </p>
      </div>
    </form>
  );
}
