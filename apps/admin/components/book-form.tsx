"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/image-uploader";
import { toast } from "@/components/toaster";
import { adminApi } from "@/lib/api";

export interface BookFormProps {
  initialProduct?: any;
  isEdit?: boolean;
}

function generateDefaultSku(): string {
  const yy = String(new Date().getFullYear()).slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MP-${yy}-${rand}`;
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function BookForm({ initialProduct, isEdit = false }: BookFormProps) {
  const router = useRouter();

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Titles
  const [titleTa, setTitleTa] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [sku, setSku] = useState("");

  // Core book attributes
  const [author, setAuthor] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [salePriceRupees, setSalePriceRupees] = useState("");
  const [stock, setStock] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);

  // Bilingual description
  const [descTab, setDescTab] = useState<"ta" | "en">("ta");
  const [descTa, setDescTa] = useState("");
  const [descEn, setDescEn] = useState("");

  // Additional Book Metadata (dimensions_json.book)
  const [language, setLanguage] = useState("Tamil");
  const [pages, setPages] = useState("");
  const [publisher, setPublisher] = useState("Muthamilarignar Pathipagam");
  const [binding, setBinding] = useState<"Paperback" | "Hardcover" | "Board book">("Paperback");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear().toString());

  // Form states
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadCategories = () => {
    setCategoryLoading(true);
    setCategoryError(null);
    adminApi
      .getCategories()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setCategories(list);
      })
      .catch((err: any) => {
        setCategoryError(err?.message || "Failed to load categories");
      })
      .finally(() => {
        setCategoryLoading(false);
      });
  };

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const slugCandidate = toKebabCase(newCatName.includes("|") ? newCatName.split("|")[1] : newCatName);
      const res: any = await adminApi.createCategory({
        name: newCatName.trim(),
        slug: slugCandidate || `cat-${Date.now().toString(36)}`,
      });
      const created = res?.id ? res : { id: res.id, name: newCatName.trim(), slug: slugCandidate };
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setNewCatName("");
      setShowNewCategory(false);
      toast({ kind: "success", title: "Category created", description: created.name });
    } catch (err: any) {
      toast({ kind: "error", title: "Failed to create category", description: err.message });
    } finally {
      setCreatingCat(false);
    }
  };

  // Populate initial values on edit or duplicate
  useEffect(() => {
    if (initialProduct) {
      const rawName = initialProduct.name || "";
      if (rawName.includes("|")) {
        const [ta, en] = rawName.split("|");
        setTitleTa(ta.trim());
        setTitleEn(en.trim());
      } else {
        setTitleTa(rawName);
        setTitleEn(rawName);
      }

      setSlug(initialProduct.slug || "");
      setSlugManuallyEdited(true);
      setSku(initialProduct.sku || generateDefaultSku());

      if (initialProduct.price_cents != null) {
        setPriceRupees((initialProduct.price_cents / 100).toString());
      }
      if (initialProduct.sale_price_cents != null) {
        setSalePriceRupees((initialProduct.sale_price_cents / 100).toString());
      }

      const inv = initialProduct.inventory_quantity ?? initialProduct.inventory ?? 10;
      setStock(String(inv));

      setCategoryId(initialProduct.category_id || "");

      // Images: always prefer image_url as primary cover, followed by unique gallery images
      const rawList: string[] = Array.isArray(initialProduct.images)
        ? initialProduct.images
        : Array.isArray(initialProduct.images_json)
        ? initialProduct.images_json
        : [];
      const primaryCover = (initialProduct.image_url || rawList[0] || "").trim();
      const extraGallery = rawList.filter((u) => u && u !== primaryCover).slice(0, 4);

      if (primaryCover) {
        setCoverUrl(primaryCover);
        setGalleryUrls(extraGallery);
      }

      // Tags
      const tags: string[] = Array.isArray(initialProduct.tags) ? initialProduct.tags : [];
      setFeatured(tags.includes("featured"));

      // Description
      const rawDesc = initialProduct.description || "";
      if (rawDesc.includes("|")) {
        const [dTa, dEn] = rawDesc.split("|");
        setDescTa(dTa.trim());
        setDescEn(dEn.trim());
      } else {
        setDescTa(rawDesc);
        setDescEn(rawDesc);
      }

      // Book metadata
      const bookData = initialProduct.dimensions_json?.book || {};
      if (bookData.author) setAuthor(bookData.author);
      if (bookData.publisher) setPublisher(bookData.publisher);
      if (bookData.language) setLanguage(bookData.language);
      if (bookData.pages) setPages(String(bookData.pages));
      if (bookData.binding) setBinding(bookData.binding);
      if (bookData.isbn) setIsbn(bookData.isbn);
      if (bookData.year) setYear(String(bookData.year));
    } else {
      setSku(generateDefaultSku());
      setYear(new Date().getFullYear().toString());
    }
  }, [initialProduct]);

  const normalizeSeriesWording = (val: string) =>
    val.replace(/\b(?:Part|Volume|Vol\.?)\s*(\d+)\b/gi, "Vol. $1");

  // Handle titleEn change and slug auto-generation
  const handleTitleEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleEn(val);
    if (!slugManuallyEdited && !isEdit) {
      setSlug(toKebabCase(val));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!titleTa.trim()) newErrors.titleTa = "Tamil title is required (தமிழ் தலைப்பு)";
    if (!titleEn.trim()) newErrors.titleEn = "English title is required";
    if (!author.trim()) newErrors.author = "Author name is required";

    if (!priceRupees.trim()) {
      newErrors.priceRupees = "Price is required";
    } else {
      const p = parseFloat(priceRupees);
      if (isNaN(p) || p <= 0) {
        newErrors.priceRupees = "Enter a valid positive price";
      }
    }

    if (salePriceRupees.trim()) {
      const sp = parseFloat(salePriceRupees);
      const p = parseFloat(priceRupees);
      if (isNaN(sp) || sp < 0) {
        newErrors.salePriceRupees = "Enter a valid sale price";
      } else if (!isNaN(p) && sp >= p) {
        newErrors.salePriceRupees = "Sale price must be strictly less than regular price";
      }
    }

    if (!stock.trim() || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) {
      newErrors.stock = "Enter a valid stock quantity (0 or more)";
    }

    if (!categoryId.trim()) {
      newErrors.categoryId = "Category is required";
    }

    if (!coverUrl.trim()) {
      newErrors.coverUrl = "Cover image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (visibility: "published" | "hidden", andAnother = false) => {
    if (!validate()) {
      toast({
        kind: "error",
        title: "Please fix validation errors",
        description: "Check the highlighted fields above.",
      });
      return;
    }

    setSaving(true);
    try {
      const priceCents = Math.round(parseFloat(priceRupees) * 100);
      const salePriceCents = salePriceRupees.trim()
        ? Math.round(parseFloat(salePriceRupees) * 100)
        : null;

      const cleanTitleEn = normalizeSeriesWording(titleEn.trim());
      const combinedName = `${titleTa.trim()}|${cleanTitleEn}`;
      const combinedDesc =
        descTa.trim() && descEn.trim()
          ? `${descTa.trim()}|${descEn.trim()}`
          : descTa.trim() || descEn.trim() || null;

      const cleanCover = coverUrl.trim();
      const allImages = Array.from(
        new Set(
          [cleanCover, ...galleryUrls.map((u) => u.trim()).filter(Boolean)].filter(
            (url) => url && !url.startsWith("blob:") && !url.startsWith("data:")
          )
        )
      );

      const existingTags: string[] = Array.isArray(initialProduct?.tags)
        ? initialProduct.tags.filter((t: string) => t !== "featured")
        : [];
      if (featured) existingTags.push("featured");

      const bookMeta = {
        author: author.trim(),
        publisher: publisher.trim() || "Muthamilarignar Pathipagam",
        language: language.trim() || "Tamil",
        pages: pages.trim() ? parseInt(pages.trim(), 10) || pages.trim() : null,
        binding: binding || "Paperback",
        isbn: isbn.trim() || null,
        year: year.trim() ? parseInt(year.trim(), 10) || year.trim() : null,
      };

      const payload: any = {
        name: combinedName,
        slug: slug.trim() || toKebabCase(cleanTitleEn),
        sku: sku.trim(),
        price_cents: priceCents,
        sale_price_cents: salePriceCents,
        inventory: parseInt(stock, 10) || 0,
        inventory_quantity: parseInt(stock, 10) || 0,
        inventory_track: true,
        inventory_policy: "deny",
        tax_class: "zero",
        category_id: categoryId || null,
        visibility: visibility,
        tags: existingTags,
        description: combinedDesc,
        image_url: cleanCover,
        images: allImages,
        dimensions_json: {
          ...(initialProduct?.dimensions_json || {}),
          book: bookMeta,
        },
      };

      if (isEdit && initialProduct?.id) {
        const updated = await adminApi.updateProduct(initialProduct.id, payload);
        await fetch("/api/revalidate-storefront", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant: "demo-store",
            productId: updated?.id || initialProduct.id,
            slug: payload.slug,
          }),
        }).catch(() => {});
        toast({ kind: "success", title: "Book updated successfully" });
        router.push("/products");
      } else {
        const created = await adminApi.createProduct(payload);
        await fetch("/api/revalidate-storefront", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant: "demo-store",
            productId: created?.id || payload.slug,
            slug: payload.slug,
          }),
        }).catch(() => {});
        toast({ kind: "success", title: "Book created successfully" });
        if (andAnother) {
          setTitleTa("");
          setTitleEn("");
          setSlug("");
          setSlugManuallyEdited(false);
          setSku(generateDefaultSku());
          setAuthor("");
          setPriceRupees("");
          setSalePriceRupees("");
          setStock("10");
          setCoverUrl("");
          setGalleryUrls([]);
          setDescTa("");
          setDescEn("");
          setPages("");
          setIsbn("");
          setErrors({});
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          router.push("/products");
        }
      }
    } catch (err: any) {
      toast({
        kind: "error",
        title: "Failed to save book",
        description: err.message || "An unexpected error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = () => {
    if (!initialProduct) return;
    const freshSku = generateDefaultSku();
    const copySlug = `${slug || toKebabCase(titleEn)}-copy`;

    // Navigate to create page with prefilled query/session
    sessionStorage.setItem(
      "duplicate_book_draft",
      JSON.stringify({
        ...initialProduct,
        id: undefined,
        slug: copySlug,
        sku: freshSku,
      })
    );
    router.push("/products/create?duplicate=1");
  };

  return (
    <div className="max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-neutral-100">
            {isEdit ? "Edit Book" : "Add New Book"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Manage bookstore catalog details, cover artwork, and pricing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Title & Identity */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Book Titles & Identifiers
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Title in Tamil <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="எ.கா. காலம் தோறும் கலைஞர்"
                value={titleTa}
                onChange={(e) => setTitleTa(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.titleTa ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                }`}
              />
              {errors.titleTa && <p className="text-xs text-red-500 mt-1">{errors.titleTa}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Title in English <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dravida Cinema (Vol. 1)"
                value={titleEn}
                onChange={handleTitleEnChange}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.titleEn ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                }`}
              />
              <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-1">
                For multi-volume series, use <strong>&ldquo;Vol. 1&rdquo;</strong>, <strong>&ldquo;Vol. 2&rdquo;</strong> (automatically standardized on save).
              </p>
              {errors.titleEn && <p className="text-xs text-red-500 mt-1">{errors.titleEn}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Author <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. மு. கருணாநிதி"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.author ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                  }`}
                />
                {errors.author && <p className="text-xs text-red-500 mt-1">{errors.author}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    + New category
                  </button>
                </div>

                {showNewCategory && (
                  <div className="mb-2 p-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 space-y-2">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                      Add New Category (தமிழ் | English)
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. சிறுகதைகள் | Short Stories"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={creatingCat || !newCatName.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-blue-700"
                      >
                        {creatingCat ? "Adding..." : "Add"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(false)}
                        className="text-xs text-gray-500 hover:underline px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {categoryError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
                    <span>{categoryError}</span>
                    <button
                      type="button"
                      onClick={loadCategories}
                      className="ml-2 font-bold underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.categoryId ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                    }`}
                  >
                    <option value="">{categoryLoading ? "Loading categories..." : "-- Select Category (Required) --"}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm font-mono bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Unique store URL path</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm font-mono bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Default: MP-YY-XXXX</p>
              </div>
            </div>
          </div>

          {/* Card: Pricing & Stock */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Pricing & Inventory
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Regular Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="350"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className={`w-full rounded-xl border pl-8 pr-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.priceRupees ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                    }`}
                  />
                </div>
                {errors.priceRupees && <p className="text-xs text-red-500 mt-1">{errors.priceRupees}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Sale Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="299"
                    value={salePriceRupees}
                    onChange={(e) => setSalePriceRupees(e.target.value)}
                    className={`w-full rounded-xl border pl-8 pr-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      errors.salePriceRupees ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                    }`}
                  />
                </div>
                {errors.salePriceRupees && <p className="text-xs text-red-500 mt-1">{errors.salePriceRupees}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Stock Units <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.stock ? "border-red-500" : "border-gray-200 dark:border-neutral-800"
                  }`}
                />
                {errors.stock && <p className="text-xs text-red-500 mt-1">{errors.stock}</p>}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                  Featured Book (showcases in home featured section)
                </span>
              </label>
            </div>
          </div>

          {/* Card: Bilingual Description */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                Book Synopsis / Description
              </h2>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDescTab("ta")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    descTab === "ta"
                      ? "bg-white dark:bg-neutral-950 shadow-sm text-gray-900 dark:text-neutral-100"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-neutral-200"
                  }`}
                >
                  தமிழ் (Tamil)
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab("en")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    descTab === "en"
                      ? "bg-white dark:bg-neutral-950 shadow-sm text-gray-900 dark:text-neutral-100"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-neutral-200"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {descTab === "ta" ? (
              <div>
                <textarea
                  rows={5}
                  placeholder="நூல் பற்றிய விவரிப்பு..."
                  value={descTa}
                  onChange={(e) => setDescTa(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            ) : (
              <div>
                <textarea
                  rows={5}
                  placeholder="Book overview and description in English..."
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 p-3.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Card: Publishing Specifications */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Publishing Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Publisher
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Binding Type
                </label>
                <select
                  value={binding}
                  onChange={(e) => setBinding(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Paperback">Paperback</option>
                  <option value="Hardcover">Hardcover</option>
                  <option value="Board book">Board book</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Number of Pages
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="320"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  ISBN
                </label>
                <input
                  type="text"
                  placeholder="978-81-..."
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm font-mono bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                  Publication Year
                </label>
                <input
                  type="number"
                  placeholder="2024"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Imagery & Gallery */}
        <div className="space-y-6">
          {/* Main Book Cover */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 border-b border-gray-100 dark:border-neutral-800 pb-3">
              Cover Image <span className="text-red-500">*</span>
            </h2>
            <ImageUploader
              label="Front Cover Artwork"
              ratio={[3, 4]}
              targetWidth={900}
              value={coverUrl}
              onChange={(url) => setCoverUrl(url)}
              kind="book-cover"
              required
            />
            {errors.coverUrl && <p className="text-xs text-red-500 mt-1">{errors.coverUrl}</p>}
          </div>

          {/* Additional Gallery Artwork (up to 4) */}
          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                Gallery Artwork
              </h2>
              <span className="text-xs text-gray-400">Up to 4 images</span>
            </div>

            <div className="space-y-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="border-t border-gray-100 dark:border-neutral-800 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-600 dark:text-neutral-400">
                      Gallery Image {idx + 1}
                    </span>
                    {galleryUrls[idx] && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...galleryUrls];
                          updated.splice(idx, 1);
                          setGalleryUrls(updated);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <ImageUploader
                    label={`Gallery Image ${idx + 1}`}
                    ratio={[3, 4]}
                    targetWidth={900}
                    value={galleryUrls[idx] || ""}
                    onChange={(url) => {
                      const updated = [...galleryUrls];
                      updated[idx] = url;
                      setGalleryUrls(updated);
                    }}
                    kind="book-gallery"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="text-sm font-medium text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {isEdit && (
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Duplicate Book
              </button>
            )}

            {!isEdit && (
              <button
                type="button"
                onClick={() => handleSubmit("published", true)}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Save & Add Another
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit("hidden")}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit("published")}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#E52320] text-white hover:bg-[#c91e1b] transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
