"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { adminApi } from "@/lib/api";
import { AuthManager } from "@/lib/auth";
import { toast } from "@/components/toaster";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const data = await adminApi.login(email.trim(), password);
      AuthManager.setToken(data.access_token);
      adminApi.setToken(data.access_token);
      window.location.href = "/dashboard";
    } catch (error: any) {
      const msg = error?.message || error?.detail || "Invalid email or password. Please verify credentials or backend status.";
      setErrorMessage(msg);
      toast({ kind: "error", title: "Login failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Muthamilarignar Pathipagam"
            className="mx-auto h-20 w-20 rounded-2xl object-contain bg-white border border-gray-200 dark:border-neutral-800 p-1 shadow-sm"
          />
          <h1 className="mt-5 text-[24px] font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            முத்தமிழறிஞர் பதிப்பகம்
          </h1>
          <p className="mt-1 text-[14px] font-medium text-red-600 dark:text-red-400">
            Muthamilarignar Pathipagam — Admin
          </p>
          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-neutral-500">
            Sign in to manage books, inventory, and orders.
          </p>
        </div>

        {isExpired && !errorMessage && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-center text-xs font-semibold text-amber-800 dark:text-amber-200">
            Session expired, please log in again.
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-3 text-center text-xs font-semibold text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            type="email"
            placeholder="Email (e.g. owner@demo.test or admin@infalette.com)"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full h-12 rounded-full border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full h-12 rounded-full border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-blue-600 disabled:bg-gray-300 text-white text-[15px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            {submitting ? "Signing in…" : "Sign in with password"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-900 text-center">
          <p className="text-[12px] font-semibold text-gray-500 dark:text-neutral-400 mb-2">
            Quick fill default accounts:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("owner@demo.test");
                setPassword("demo1234");
                setErrorMessage(null);
              }}
              className="px-3 py-1.5 rounded-xl text-[11.5px] font-medium border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
            >
              Store Owner (owner@demo.test)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@infalette.com");
                setPassword("demo1234");
                setErrorMessage(null);
              }}
              className="px-3 py-1.5 rounded-xl text-[11.5px] font-medium border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
            >
              Admin (admin@infalette.com)
            </button>
          </div>
        </div>

        {Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
              <span className="text-[12px] text-gray-500">or continue with Clerk</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="h-11 px-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black text-[14px] font-medium hover:opacity-90"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="h-11 px-6 rounded-full border border-gray-200 dark:border-neutral-800 text-[14px] font-medium hover:bg-gray-50 dark:hover:bg-neutral-950"
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/login" />
              </SignedIn>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-[12px] text-gray-500 dark:text-neutral-500">
          Default: owner@demo.test / demo1234
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}