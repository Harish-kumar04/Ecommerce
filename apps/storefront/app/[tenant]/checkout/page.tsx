"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { storefrontApi } from "@/lib/api";
import { notifyCartChanged } from "@/lib/cart-events";
import { useLanguage } from "@/components/language-provider";
import CheckoutForm from "@/components/checkout/checkout-form";
import PenLoader from "@/components/ui/pen-loader";

function hasRealOrderId(orderObj: any): boolean {
  const oid = orderObj?.order_id || orderObj?.id;
  if (!oid || typeof oid !== "string") return false;
  if (oid.startsWith("ord-") || oid.startsWith("chk-") || oid.startsWith("MP-")) return false;
  return true;
}

export default function CheckoutPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkout, setCheckout] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [razorpayEnabled, setRazorpayEnabled] = useState<boolean>(false);
  const [cartSubtotalCents, setCartSubtotalCents] = useState<number>(0);
  const [cartItems, setCartItems] = useState<any[]>([]);

  const clearClientCartBadges = () => {
    notifyCartChanged(params.tenant);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mp_fallback_cart");
        localStorage.removeItem("infalette-local-cart");
        localStorage.removeItem(`store_applied_coupon_${params.tenant}`);
        localStorage.setItem("infalette-cart-count", "0");
        localStorage.setItem("infalette-cart-total", "0");
      } catch {}
    }
  };

  useEffect(() => {
    let cancelled = false;
    storefrontApi
      .getStore(params.tenant)
      .then((store) => {
        if (!cancelled) {
          setRazorpayEnabled(Boolean(store?.razorpay_enabled));
        }
      })
      .catch(() => {
        if (!cancelled) setRazorpayEnabled(false);
      });

    storefrontApi
      .getCart(params.tenant)
      .then((c) => {
        if (cancelled) return;
        const cartObj = c?.cart || c?.data || c;
        const items = cartObj?.items || cartObj?.cart_items || [];
        setCartItems(Array.isArray(items) ? items : []);
        const sub =
          cartObj?.total_cents ??
          items.reduce(
            (s: number, it: any) =>
              s + (it.unit_price_cents ?? it.price_cents ?? 0) * (it.quantity ?? 1),
            0,
          );
        setCartSubtotalCents(sub || 0);
      })
      .catch(() => {});

    // Handle return from Razorpay callback_url (?checkout_id=...)
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const returnedCheckoutId = sp.get("checkout_id");
      if (returnedCheckoutId) {
        setLoading(true);
        (async () => {
          for (let attempt = 0; attempt < 5; attempt++) {
            if (cancelled) return;
            try {
              const chk = await storefrontApi.getCheckout(params.tenant, returnedCheckoutId);
              if (cancelled) return;
              setCheckout(chk);
              if (chk?.order_id && !String(chk.order_id).startsWith("ord-")) {
                setOrder({
                  order_id: chk.order_id,
                  order_number: chk.order_number,
                  status: chk.order_status || "confirmed",
                  cod: false,
                });
                setStep(3);
                clearClientCartBadges();
                setLoading(false);
                return;
              }
              if (chk?.status === "failed" || chk?.status === "cancelled") {
                setError(
                  "Payment was not completed. Your cart items are still saved — please try again.",
                );
                setStep(1);
                setLoading(false);
                return;
              }
            } catch (err: any) {
              if (cancelled) return;
              setError(err?.message || "Unable to verify payment status.");
              setStep(1);
              setLoading(false);
              return;
            }
            await new Promise((r) => setTimeout(r, 1200));
          }
          if (!cancelled) {
            setError(
              "Payment confirmation is still pending from Razorpay. Please check My Orders in a moment.",
            );
            setStep(1);
            setLoading(false);
          }
        })();
      }
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant]);

  const handleCheckout = async (data: any) => {
    setLoading(true);
    setError(null);
    const chosenProvider = data.payment_provider || (razorpayEnabled ? "razorpay" : "cod");
    setPaymentMethod(chosenProvider);
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
      const checkoutId = res?.id || res?.checkout_id;
      if (!checkoutId || String(checkoutId).startsWith("chk-")) {
        throw new Error("Checkout could not be created. Please try again.");
      }
      setCheckout(res);

      const payRes = await storefrontApi.initiatePayment(
        params.tenant,
        checkoutId,
        chosenProvider,
      );

      if (hasRealOrderId(payRes)) {
        setOrder(payRes);
        setStep(3);
        clearClientCartBadges();
        return;
      }

      const paymentUrl = payRes?.payment_url || payRes?.url;
      if (paymentUrl) {
        setCheckout({ ...res, ...payRes });
        setStep(2);
        setTimeout(() => {
          window.location.href = paymentUrl;
        }, 600);
        return;
      }

      throw new Error("Order could not be confirmed by the server. Your cart has been preserved.");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Checkout failed";
      setError(Array.isArray(msg) ? msg.join(", ") : String(msg));
      setOrder(null);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-site max-w-6xl py-10 sm:py-14">
      <header className="mb-8">
        <p className="eyebrow">{t("பாதுகாப்பான ஆர்டர்", "Secure Checkout")}</p>
        <h1 className="mt-2 text-[32px] sm:text-[42px] font-extrabold tracking-tight text-black">
          {t("உங்கள் ஆர்டரை நிறைவு செய்க", "Complete Your Order")}
        </h1>
        <div aria-hidden="true" className="mt-3 h-1 w-14 rounded-full bg-brand-red" />
      </header>

      {/* Step Progress Indicator */}
      <ol aria-label="Checkout progress" className="mb-8 flex flex-wrap items-center gap-2 sm:gap-3">
        {[
          { id: 1, ta: "விவரங்கள் & கட்டணம்", en: "Shipping & Payment" },
          { id: 2, ta: "சரிபார்ப்பு", en: "Payment Gateway" },
          { id: 3, ta: "உறுதிப்படுத்தல்", en: "Order Confirmed" },
        ].map((s, idx) => {
          const reached = step >= s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${
                  reached ? "bg-black text-white" : "bg-[#FAFAFA] border border-black/15 text-black/60"
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`text-[13.5px] font-semibold ${
                  reached ? "text-black" : "text-black/60"
                }`}
              >
                {t(s.ta, s.en)}
              </span>
              {idx < 2 && (
                <span className="mx-1 text-black/30" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-brand-red/30 bg-brand-red-light px-5 py-3.5 text-[14px] font-semibold text-brand-red-dark"
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <CheckoutForm
          tenant={params.tenant}
          razorpayEnabled={razorpayEnabled}
          cartSubtotalCents={cartSubtotalCents}
          cartItems={cartItems}
          onSubmit={handleCheckout}
          loading={loading}
        />
      )}

      {step === 2 && (
        <div className="mx-auto max-w-xl rounded-2xl border border-black/10 bg-white p-10 text-center shadow-card">
          <PenLoader size="lg" label="Redirecting to payment" />
          <h2 className="mt-5 text-[22px] font-extrabold text-black">
            {t("கட்டணப் பக்கத்திற்கு அழைத்துச் செல்லப்படுகிறது", "Redirecting to Secure Payment")}
          </h2>
          <p className="mt-2 text-[15px] font-bold text-brand-red">
            {t("மொத்தத் தொகை", "Total")}: ₹
            {checkout ? (checkout.total_cents / 100).toFixed(2) : "—"}
          </p>
          <p className="mt-3 text-[13.5px] text-black/70">
            {t(
              `${paymentMethod} பாதுகாப்பான கட்டணப் பக்கம் திறக்கிறது…`,
              `Opening ${paymentMethod} secure payment gateway…`,
            )}
          </p>
          {checkout?.payment_url && (
            <a
              href={checkout.payment_url}
              className="btn-red mt-6 h-12 px-7 text-[14.5px] font-bold"
            >
              {t("இப்போதே செலுத்துக", "Pay now")}
            </a>
          )}
        </div>
      )}

      {step === 3 && hasRealOrderId(order) && (
        <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white p-8 sm:p-12 text-center shadow-glow">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-8 w-8"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-[26px] sm:text-[32px] font-extrabold text-black">
            {order?.cod
              ? "ஆர்டர் உறுதி செய்யப்பட்டது! (COD)"
              : "ஆர்டர் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!"}
          </h2>
          <p className="mt-1 text-[15px] font-semibold text-black/70">
            {order?.cod ? "Order Confirmed — Cash on Delivery" : "Order Confirmed"}
          </p>

          {/* Real Order Number Box */}
          <div className="my-6 inline-block rounded-2xl border border-black/15 bg-[#FAFAFA] px-7 py-4">
            <span className="block text-[12px] font-bold uppercase tracking-wider text-black/65">
              ஆர்டர் எண் / Order Number
            </span>
            <span className="mt-1 block font-mono text-[22px] font-extrabold text-brand-red">
              {order.order_number || order.order_id}
            </span>
          </div>

          <p className="mx-auto max-w-md text-[14.5px] leading-relaxed text-black/75">
            {order?.cod
              ? "நூல்கள் அனுப்பப்படும் போது தகவல் தெரிவிக்கப்படும். டெலிவரியின் போது ரொக்கமாகப் பணம் செலுத்தவும்."
              : "ஆர்டர் உறுதிப்படுத்தல் விவரங்கள் உங்கள் தொடர்பு எண்ணுக்கு அனுப்பப்படும். விரைவாக அனுப்பி வைக்கப்படும்."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`https://wa.me/919003324473?text=${encodeURIComponent(
                `வணக்கம், எனது ஆர்டர் எண்: ${order.order_number || order.order_id}. விவரங்களை அறிய விரும்புகிறேன்.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#1F8B4C] px-6 text-[14.5px] font-bold text-white shadow-md hover:bg-[#186E3C] transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.053-.984-.047-.35-.099-.806-.26-1.391-.515-1.077-.47-1.89-1.285-2.42-2.02-.058-.081-.397-.534-.397-1.025 0-.491.258-.733.35-.834.093-.102.203-.128.271-.128.069 0 .138.001.198.005.064.004.148-.024.232.176.085.204.288.705.313.756.025.051.042.111.009.179-.034.068-.051.111-.102.171-.051.06-.107.134-.153.18-.051.051-.105.107-.045.21.06.102.268.442.576.716.396.353.731.462.834.513.102.051.162.043.222-.026.06-.068.258-.301.326-.404.069-.102.138-.085.231-.051.093.034.59.278.692.329.102.051.17.077.195.12.026.042.026.435-.118.84z" />
              </svg>
              வாட்ஸ்அப்பில் உறுதிப்படுத்துக (WhatsApp)
            </a>

            <Link
              href={`/${params.tenant}/orders`}
              className="btn-outline h-12 w-full sm:w-auto px-6 text-[14.5px] font-bold"
            >
              ஆர்டர்களைக் காண்க / My Orders
            </Link>

            <Link
              href={`/${params.tenant}/products`}
              className="btn-black h-12 w-full sm:w-auto px-6 text-[14.5px] font-bold"
            >
              மேலும் நூல்கள் / Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}