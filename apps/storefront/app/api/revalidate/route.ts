import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secretHeader =
    req.headers.get("x-revalidate-secret") ||
    req.headers.get("revalidate-secret") ||
    req.nextUrl.searchParams.get("secret");

  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ message: "Invalid revalidation secret" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tenant = body.tenant || "demo-store";
    const productId = body.productId || body.id;
    const slug = body.slug;

    // Revalidate specific tenant paths
    revalidatePath(`/${tenant}`, "page");
    revalidatePath(`/${tenant}/products`, "page");
    if (productId) {
      revalidatePath(`/${tenant}/products/${productId}`, "page");
    }
    if (slug && slug !== productId) {
      revalidatePath(`/${tenant}/products/${slug}`, "page");
    }
    // Also revalidate layout and pattern paths
    revalidatePath("/[tenant]", "layout");
    revalidatePath("/[tenant]/products", "page");
    revalidatePath("/[tenant]/products/[id]", "page");

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      paths: [
        `/${tenant}`,
        `/${tenant}/products`,
        productId ? `/${tenant}/products/${productId}` : null,
        slug && slug !== productId ? `/${tenant}/products/${slug}` : null,
      ].filter(Boolean),
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: "Error revalidating", error: err.message },
      { status: 500 }
    );
  }
}
