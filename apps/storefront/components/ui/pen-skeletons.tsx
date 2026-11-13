import PenLoader from "./pen-loader";

export function PenCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading book"
      className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-card"
    >
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#FAFAFA]">
        <PenLoader size="md" label="Loading book cover" />
      </div>
      <div className="space-y-2.5 p-4 sm:p-5">
        <div className="h-4 w-4/5 rounded-full bg-black/[0.06]" />
        <div className="h-3 w-1/2 rounded-full bg-black/[0.04]" />
        <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3">
          <div className="h-5 w-16 rounded-full bg-brand-red/15" />
          <div className="h-9 w-20 rounded-full bg-black/[0.06]" />
        </div>
      </div>
    </div>
  );
}

export function PenGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading books"
      className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <PenCardSkeleton key={i} />
      ))}
    </div>
  );
}
