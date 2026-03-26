import Link from "next/link";
import { geocodeCity } from "@/lib/geocode";
import type { City } from "@/types";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

function getString(sp: SearchParams, key: string): string | undefined {
  const val = sp[key];
  return typeof val === "string" ? val : undefined;
}

async function resolveCity(
  slug: string,
  sp: SearchParams
): Promise<City | null> {
  const lat = parseFloat(getString(sp, "lat") ?? "");
  const lon = parseFloat(getString(sp, "lon") ?? "");
  const name = getString(sp, "name");
  const country = getString(sp, "country") ?? "";

  // Fast path: all data already in URL from CitySearch navigation
  if (!isNaN(lat) && !isNaN(lon) && name) {
    return { name, slug, country, lat, lon };
  }

  // Fallback: re-geocode from slug for direct URL access / shared links
  const query = slug.replace(/-/g, " ");
  return geocodeCity(query);
}

export default async function CityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const city = await resolveCity(slug, sp);

  if (!city) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Not found
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
              City not found
            </h1>
            <p className="mt-4 text-base leading-relaxed text-stone-500">
              We could not find a city matching{" "}
              <span className="font-medium text-stone-700">
                &ldquo;{slug.replace(/-/g, " ")}&rdquo;
              </span>
              . Try searching again with a different spelling.
            </p>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-block rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Search again
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-16">
        {/* City hero */}
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            City setup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            {city.name}
          </h1>
          {city.country && (
            <p className="mt-1 text-base text-stone-400">{city.country}</p>
          )}
        </div>

        {/* Placeholder sections — Task 03 replaces these with live data */}
        <div className="mt-12 space-y-4">
          <PlaceholderSection label="Routine summary" />
          <PlaceholderSection label="Recommended area" />
          <PlaceholderSection label="Work spots" />
          <PlaceholderSection label="Coworking backup" />
          <PlaceholderSection label="Training spots" />
          <PlaceholderSection label="Food &amp; coffee" />
        </div>

        <p className="mt-10 text-xs text-stone-400">
          Place data and scoring load in Task 03. Geocoding is live —
          coordinates:{" "}
          <span className="font-mono">
            {city.lat.toFixed(4)}, {city.lon.toFixed(4)}
          </span>
        </p>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← Back
        </Link>
        <span className="text-stone-200">|</span>
        <span className="text-base font-semibold tracking-tight text-stone-900">
          Trustay
        </span>
      </div>
    </header>
  );
}

function PlaceholderSection({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-300">
        {label}
      </p>
      <p className="mt-2 text-sm text-stone-300">Loading in Task 03</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-xs text-stone-400">Trustay</p>
      </div>
    </footer>
  );
}
