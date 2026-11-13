import PenLoader from "@/components/ui/pen-loader";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-white px-4 py-20 text-center"
    >
      <PenLoader size="lg" label="Loading" />
      <p className="text-[14px] font-semibold text-black/70">
        <span className="i18n-ta">ஏற்றுகிறது…</span>
        <span className="i18n-en">Loading…</span>
      </p>
    </div>
  );
}
