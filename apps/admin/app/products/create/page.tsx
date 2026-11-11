"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookForm } from "@/components/book-form";

export default function CreateProductPage() {
  const searchParams = useSearchParams();
  const [duplicateDraft, setDuplicateDraft] = useState<any>(null);

  useEffect(() => {
    if (searchParams.get("duplicate")) {
      try {
        const raw = sessionStorage.getItem("duplicate_book_draft");
        if (raw) {
          setDuplicateDraft(JSON.parse(raw));
          sessionStorage.removeItem("duplicate_book_draft");
        }
      } catch {}
    }
  }, [searchParams]);

  return <BookForm initialProduct={duplicateDraft} isEdit={false} />;
}
