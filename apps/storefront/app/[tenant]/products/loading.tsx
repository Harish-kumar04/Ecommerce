import { PenGridSkeleton } from "@/components/ui/pen-skeletons";

export default function ProductsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading books" className="container-site py-10 sm:py-14">
      <div className="mb-8 space-y-3">
        <div className="h-3.5 w-40 rounded-full bg-brand-red/15" />
        <div className="h-10 w-64 rounded-full bg-black/[0.07]" />
      </div>
      <PenGridSkeleton count={8} />
    </div>
  );
}
