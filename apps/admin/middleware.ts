import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);
const clerkHandler = hasClerk ? clerkMiddleware() : null;

export default function middleware(req: NextRequest, evt: NextFetchEvent) {
  if (clerkHandler) {
    return clerkHandler(req, evt);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
