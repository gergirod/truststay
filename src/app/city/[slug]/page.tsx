type Props = {
  params: Promise<{ slug: string }>;
};

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const cityName = slugToTitle(slug);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <a
            href="/"
            className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← Back
          </a>
          <span className="text-stone-200">|</span>
          <span className="text-base font-semibold tracking-tight text-stone-900">
            Trustay
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            City setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            {cityName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-500">
            City analysis and place data will load here in Task 02. Geocoding,
            Overpass data, scoring, and confidence cards are all coming next.
          </p>

          <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
            <p className="text-sm font-semibold text-stone-500">
              Searching for:{" "}
              <span className="text-stone-900">{cityName}</span>
            </p>
            <p className="mt-2 text-xs text-stone-400">
              Route active — full city data pipeline ships in Task 02.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-xs text-stone-400">Trustay</p>
        </div>
      </footer>
    </div>
  );
}
