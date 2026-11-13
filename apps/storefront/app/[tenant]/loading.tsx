import PenLoader from "@/components/ui/pen-loader";
import { PenGridSkeleton } from "@/components/ui/pen-skeletons";

export default function TenantLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="container-site py-10 sm:py-14">
      <div className="mb-10 flex flex-col items-center justify-center rounded-3xl border border-black/[0.06] bg-[#FAFAFA] py-16">
        <PenLoader size="lg" label="Loading storefront" />
        <p className="mt-3 text-[13.5px] font-semibold text-black/65">
          <span className="i18n-ta">நூலகம் ஏற்றப்படுகிறது…</span>
          <span className="i18n-en">Loading publications…</span>
        </p>
      </div>
      <PenGridSkeleton count={8} />
    </div>
  );
}
