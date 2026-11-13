"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Img from "@/components/ui/img";
import logo from "@/public/brand/logo-144.webp";

export default function HeaderLogo({ tenant }: { tenant: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Link
      href={`/${tenant}`}
      prefetch={false}
      className="flex flex-shrink-0 items-center transition-all duration-200"
      aria-label="முத்தமிழறிஞர் பதிப்பகம் / Muthamilarignar Pathipagam"
    >
      <Img
        src={logo}
        alt="முத்தமிழறிஞர் பதிப்பகம்"
        width={144}
        height={144}
        loading="eager"
        placeholder="empty"
        sizes="(max-width: 640px) 56px, (max-width: 1024px) 56px, 72px"
        className={`w-auto object-contain transition-transform duration-300 ${
          scrolled ? "h-[48px] sm:h-[52px]" : "h-[56px] lg:h-[72px]"
        }`}
      />
    </Link>
  );
}
