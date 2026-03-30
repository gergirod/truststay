import { CityLoadingAnimation } from "@/components/CityLoadingAnimation";

export default function CityLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="border-b border-dune bg-cream">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <div className="h-4 w-12 rounded bg-dune/90 animate-pulse" />
          <div className="h-4 w-px bg-dune" />
          <div className="h-5 w-20 rounded bg-dune/90 animate-pulse" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
        <div className="mb-8 space-y-3">
          <div className="h-3 w-20 rounded bg-dune/90 animate-pulse" />
          <div className="h-10 w-60 rounded bg-dune/90 animate-pulse" />
          <div className="h-4 w-40 rounded bg-dune/80 animate-pulse" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-dune bg-white shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-bark/85" />
          <CityLoadingAnimation />
        </div>
      </main>
    </div>
  );
}
