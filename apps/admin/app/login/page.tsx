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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await adminApi.login(email, password);
      AuthManager.setToken(data.access_token);
      router.push("/dashboard");
    } catch (error: any) {
      toast({ kind: "error", title: "Login failed", description: error?.message });
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

        {isExpired && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800">
            Session expired, please log in again.
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 rounded-full border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 rounded-full border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-blue-600 disabled:bg-gray-300 text-white text-[15px] font-medium hover:bg-blue-700 transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in with password"}
          </button>
        </form>

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