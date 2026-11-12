"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function ForgotPasswordPage() {
  const params = useParams<{ tenant: string }>();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");
      const res = await fetch(`${base}/auth/forgot-password`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-Tenant": params.tenant },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-2xl shadow w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        {status === "sent" ? (
          <p className="text-green-700 text-sm">If the account exists, a reset link has been sent.</p>
        ) : (
          <>
            {status === "error" && <p className="text-brand-red text-sm">Something went wrong.</p>}
            <input type="email" required className="w-full p-3 border rounded-lg" placeholder="Your account email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button disabled={busy} className="w-full py-3 rounded-lg text-white font-semibold bg-brand-red disabled:opacity-50">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
