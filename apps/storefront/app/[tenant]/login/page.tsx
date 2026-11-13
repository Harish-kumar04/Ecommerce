"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/toaster";
import { setStorefrontTokens } from "@/lib/auth";
import { resolveApiBaseUrl } from "@/lib/api";

/**
 * Customer login. On success redirects to `?next=` (defaults to
 * `/${tenant}/account`) so the sign-in flow from the account onboarding
 * screen returns the visitor to the dashboard.
 */
export default function LoginPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params;
  const search = useSearchParams();
  const next = search.get("next") || `/${tenant}/account`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant": tenant },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || "Login failed");
      }
      setStorefrontTokens(data.access_token, data.refresh_token);
      window.location.href = next;
    } catch (error: any) {
      toast({
        kind: "error",
        title: "Login failed",
        description: error?.message || "Unable to sign in",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-24 text-gray-900">
      <div className="text-center">
        <h1 className="text-[32px] font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[14px] text-gray-500">
          Sign in to your Infalette account.
        </p>
      </div>
      <form onSubmit={handleLogin} className="mt-8 space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-12 rounded-full border border-gray-200 bg-white px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full h-12 rounded-full border border-gray-200 bg-white px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-full bg-brand-red disabled:bg-gray-300 text-white text-[15px] font-medium hover:bg-brand-red-dark transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-[13px] text-gray-500 mt-6 text-center">
        New here?{" "}
        <Link
          href={`/${tenant}/signup?next=${encodeURIComponent(next)}`}
          className="text-brand-red hover:underline"
        >
          Create an account
        </Link>
        {" · "}
        <Link href={`/${tenant}/forgot-password`} className="text-brand-red hover:underline">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}