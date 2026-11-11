"use client";

import { useState } from "react";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import CheckoutForm from "@/components/checkout/checkout-form";

export default function CheckoutPage({ params }: { params: { tenant: string } }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkout, setCheckout] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("razorpay");

  const handleCheckout = async (data: any) => {
    setLoading(true);
    setError(null);
    setPaymentMethod(data.payment_provider || "razorpay");
    try {
      const res = await storefrontApi.createCheckout(params.tenant, {
        customer_data: {
          email: data.customer.email,
          first_name: data.customer.first_name,
          last_name: data.customer.last_name,
          phone: data.customer.phone,
        },
        shipping_address: data.shipping,
        billing_address: data.billing,
        discount_codes: data.discount_codes,
      });
      setCheckout(res);
      const checkoutId = res.id || res.checkout_id;

      try {
        const payRes = await storefrontApi.initiatePayment(params.tenant, checkoutId, data.payment_provider || "razorpay");
        if (payRes.cod || payRes.order_id) {
          setOrder(payRes);
          setStep(3);
          return;
        }
        const paymentUrl = payRes.payment_url || payRes.url;
        if (paymentUrl) {
          setCheckout({ ...res, ...payRes });
          setStep(2);
          setTimeout(() => {
            window.location.href = paymentUrl;
          }, 900);
          return;
        }
      } catch (payErr: any) {
        console.warn("Payment initiation failed, showing checkout:", payErr);
      }

      setStep(2);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e.message || "Checkout failed";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <p className="text-[12px] uppercase tracking-[0.18em] text-gray-500">
          Checkout
        </p>
        <h1 className="mt-2 text-[36px] sm:text-[44px] font-semibold tracking-tight text-gray-900">
          Complete your order.
        </h1>
      </header>

      <div className="flex items-center gap-2 mb-8">
        {[
          { id: 1, label: "Details" },
          { id: 2, label: "Payment" },
          { id: 3, label: "Confirmation" },
        ].map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium ${
                step >= s.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {idx + 1}
            </span>
            <span
              className={`text-[13px] ${
                step >= s.id ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {idx < 2 && <span className="text-gray-300 mx-2">/</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-brand-red-soft bg-brand-red-light text-brand-red-dark px-4 py-3 text-[14px] mb-6">
          {error}
        </div>
      )}

      {step === 1 && <CheckoutForm onSubmit={handleCheckout} loading={loading} />}

      {step === 2 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-gray-100 border-t-brand-red animate-spin" />
          <h2 className="mt-5 text-[20px] font-semibold text-gray-900">
            Checkout created
          </h2>
          <p className="mt-2 text-[14px] text-gray-500">
            Total: ₹{checkout ? (checkout.total_cents / 100).toFixed(2) : "—"}
          </p>
          <p className="mt-1 text-[12px] text-gray-400">
            Reservation expires in 2 hours.
          </p>
          <p className="mt-4 text-[13px] text-gray-600">
            Redirecting to {paymentMethod} secure payment page…
          </p>
          {checkout?.payment_url && (
            <a
              href={checkout.payment_url}
              className="mt-6 inline-flex h-11 px-6 items-center justify-center rounded-full bg-brand-red text-white text-[14px] font-medium hover:bg-brand-red-dark transition-colors"
            >
              Pay now
            </a>
          )}
          <button
            onClick={() => setStep(3)}
            className="block mt-4 text-[12px] text-gray-500 hover:underline"
          >
            I&apos;ve completed payment — show confirmation
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-black/10 bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-[26px] sm:text-[32px] font-extrabold text-black">
            {order?.cod ? "ஆர்டர் உறுதி செய்யப்பட்டது! (COD)" : "ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது!"}
          </h2>
          <p className="text-[15px] font-medium text-black/60 mt-1">
            {order?.cod ? "Order Confirmed — Cash on Delivery" : "Order Placed Successfully"}
          </p>

          {/* Order ID Box */}
          <div className="my-6 inline-block rounded-xl bg-black/[0.04] border border-black/10 px-6 py-3.5">
            <span className="block text-[12px] font-semibold uppercase tracking-wider text-black/50">
              ஆர்டர் எண் / Order ID
            </span>
            <span className="block text-[20px] font-mono font-extrabold text-brand-red mt-0.5">
              {order?.order_number || order?.order_id || checkout?.id || `MP-${Date.now().toString().slice(-6)}`}
            </span>
          </div>

          <p className="text-[14.5px] leading-relaxed text-black/70 max-w-md mx-auto">
            {order?.cod
              ? "நூல்கள் அனுப்பப்படும் போது தகவல் தெரிவிக்கப்படும். டெலிவரியின் போது ரொக்கமாக பணம் செலுத்தவும்."
              : "ஆர்டர் உறுதிப்படுத்தல் விவரங்கள் உங்கள் தொடர்பு எண்ணுக்கு அனுப்பப்படும். விரைவாக அனுப்பி வைக்கப்படும்."}
          </p>

          {/* WhatsApp Direct Link */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/919003324473?text=${encodeURIComponent(
                `வணக்கம், எனது ஆர்டர் எண்: ${order?.order_number || order?.order_id || checkout?.id || ""}. விவரங்களை அறிய விரும்புகிறேன்.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[14.5px] font-bold text-white shadow-md hover:bg-[#20ba59] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.053-.984-.047-.35-.099-.806-.26-1.391-.515-1.077-.47-1.89-1.285-2.42-2.02-.058-.081-.397-.534-.397-1.025 0-.491.258-.733.35-.834.093-.102.203-.128.271-.128.069 0 .138.001.198.005.064.004.148-.024.232.176.085.204.288.705.313.756.025.051.042.111.009.179-.034.068-.051.111-.102.171-.051.06-.107.134-.153.18-.051.051-.105.107-.045.21.06.102.268.442.576.716.396.353.731.462.834.513.102.051.162.043.222-.026.06-.068.258-.301.326-.404.069-.102.138-.085.231-.051.093.034.59.278.692.329.102.051.17.077.195.12.026.042.026.435-.118.84z" />
              </svg>
              வாட்ஸ்அப்பில் உறுதிப்படுத்துக (WhatsApp)
            </a>

            <Link
              href={`/${params.tenant}/orders`}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-black/20 bg-white px-6 text-[14.5px] font-bold text-black hover:bg-black/5 transition-colors"
            >
              ஆர்டர்களைக் காண்க / My Orders
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}