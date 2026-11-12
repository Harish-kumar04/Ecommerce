import Link from "next/link";

export default function BookNotFound() {
  return (
    <div className="container-site py-20 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-[#E52320]">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold text-[#111]">
          நூல் கிடைக்கவில்லை
        </h1>
        <p className="mt-1 text-[15px] font-semibold text-[#E52320]">
          Book Not Found
        </p>
        <p className="mt-3 text-[13.5px] leading-relaxed text-black/60">
          மன்னிக்கவும், நீங்கள் தேடும் நூல் தற்போது கிடைக்கவில்லை அல்லது நீக்கப்பட்டிருக்கலாம்.
          <br />
          The book you are looking for is currently unavailable or may have been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/demo-store/products"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#E52320] px-6 text-[13.5px] font-bold text-white hover:bg-black transition-colors shadow-sm"
          >
            நூல்களைப் பார்வையிடுக / Browse All Books &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
