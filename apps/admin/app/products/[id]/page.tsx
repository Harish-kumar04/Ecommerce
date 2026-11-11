"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookForm } from "@/components/book-form";
import { adminApi } from "@/lib/api";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .getProduct(id)
      .then((p) => {
        setProduct(p);
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load product details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Loading book details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-red-600 font-medium">{error || "Book not found"}</p>
        <Link
          href="/products"
          className="inline-flex px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 text-gray-800 dark:text-neutral-200"
        >
          Return to Books
        </Link>
      </div>
    );
  }

  return <BookForm initialProduct={product} isEdit={true} />;
}
