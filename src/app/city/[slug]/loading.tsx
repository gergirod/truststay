/**
 * Shown instantly while the city page Server Component is rendering.
 * Next.js wraps page.tsx in a Suspense boundary using this file, so the
 * skeleton streams to the browser before any API calls complete.
 */
export default function CityLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF8] animate-pulse">
      {/* Header */}
      <header className="border-b border-dune bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="h-5 w-24 rounded bg-dune" />
          <div className="h-4 w-16 rounded bg-dune" />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-12 space-y-10">
        {/* Back link */}
        <div className="h-4 w-16 rounded bg-dune" />

        {/* City name + meta */}
        <div className="space-y-3">
          <div className="h-3 w-20 rounded bg-dune" />
          <div className="h-8 w-56 rounded bg-dune" />
          <div className="h-4 w-32 rounded bg-dune" />
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-dune bg-white p-6 space-y-4">
          <div className="h-4 w-40 rounded bg-dune" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-14 rounded-xl bg-dune" />
            <div className="h-14 rounded-xl bg-dune" />
            <div className="h-14 rounded-xl bg-dune" />
          </div>
        </div>

        {/* Recommended area card */}
        <div className="rounded-2xl border border-dune bg-white p-6 space-y-3">
          <div className="h-3 w-28 rounded bg-dune" />
          <div className="h-6 w-48 rounded bg-dune" />
          <div className="h-4 w-full rounded bg-dune" />
          <div className="h-4 w-3/4 rounded bg-dune" />
        </div>

        {/* Place section */}
        <div className="space-y-4">
          <div className="h-5 w-36 rounded bg-dune" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-dune bg-white p-5 space-y-2">
              <div className="h-4 w-44 rounded bg-dune" />
              <div className="h-3 w-full rounded bg-dune" />
              <div className="h-3 w-2/3 rounded bg-dune" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
