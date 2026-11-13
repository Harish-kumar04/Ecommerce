"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/brand/brand-logo";
import { DEFAULT_LOGO_URL, LOGO_ALT } from "@/lib/site-defaults";

export default function HeaderLogo({
  tenant,
  logoUrl = DEFAULT_LOGO_URL,
}: {
  tenant: string;
  logoUrl?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 28);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Link
      href={`/${tenant}`}
      prefetch={false}
      aria-label={LOGO_ALT}
      className="flex flex-shrink-0 items-center rounded-lg bg-white p-0.5 transition-all duration-200"
    >
      <BrandLogo
        src={logoUrl}
        sizes="(max-width: 1024px) 52px, 72px"
        className={`transition-all duration-200 ${
          scrolled
            ? "h-[42px] lg:h-[56px]"
            : "h-[50px] lg:h-[68px]"
        }`}
      />
    </Link>
  );
}
