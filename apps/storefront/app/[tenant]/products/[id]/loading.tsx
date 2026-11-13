import PenLoader from "@/components/ui/pen-loader";

export default function BookDetailLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading book details" className="container-site py-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <div className="flex aspect-[3/4] w-full max-w-md mx-auto items-center justify-center rounded-2xl border border-black/[0.08] bg-[#FAFAFA]">
            <PenLoader size="lg" label="Loading book cover" />
          </div>
        </div>
        <div className="space-y-4 lg:col-span-7">
          <div className="h-6 w-36 rounded-full bg-brand-red/15" />
          <div className="h-10 w-4/5 rounded-full bg-black/[0.08]" />
          <div className="h-5 w-1/2 rounded-full bg-black/[0.05]" />
          <div className="h-10 w-32 rounded-full bg-brand-red/15" />
          <div className="h-36 w-full rounded-2xl bg-[#FAFAFA] border border-black/[0.06]" />
        </div>
      </div>
    </div>
  );
}
