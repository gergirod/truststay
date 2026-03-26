import { Suspense } from "react";
import Link from "next/link";
import { geocodeCity } from "@/lib/geocode";
import { fetchPlaces, sortByDistance } from "@/lib/overpass";
import { computeCitySummary } from "@/lib/scoring";
import { isUnlocked } from "@/lib/unlock";
import { RoutineSummaryCard } from "@/components/RoutineSummaryCard";
import { RecommendedAreaCard } from "@/components/RecommendedAreaCard";
import { PlaceSection } from "@/components/PlaceSection";
import { PaywallCard } from "@/components/PaywallCard";
import type { City } from "@/types";

// Free tier limits per product spec
const FREE_WORK_SPOTS = 2;
const FREE_COWORKINGS = 1;
const FREE_GYMS = 1;
const FREE_FOOD_SPOTS = 2;

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

  if (!isNaN(lat) && !isNaN(lon) && name) {
    return { name, slug, country, lat, lon };
  }

  const query = slug.replace(/-/g, " ");
  return geocodeCity(query);
}

export default async function CityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const [city, unlocked] = await Promise.all([
    resolveCity(slug, sp),
    isUnlocked(slug),
  ]);

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
        {/* Hero — renders immediately from URL params */}
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

        {/* Place data streams in via Suspense — Overpass can be slow */}
        <Suspense fallback={<PlacesSkeleton />}>
          <CityContent city={city} isUnlocked={unlocked} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

// Async server component — runs Overpass + scoring, streams into the page
async function CityContent({
  city,
  isUnlocked,
}: {
  city: City;
  isUnlocked: boolean;
}) {
  const allPlaces = await fetchPlaces(city.lat, city.lon);
  const summary = computeCitySummary(city, allPlaces);

  const workSpots = sortByDistance(
    allPlaces.filter((p) => p.category === "cafe")
  ).slice(0, 20);
  const coworkings = sortByDistance(
    allPlaces.filter((p) => p.category === "coworking")
  ).slice(0, 10);
  const gyms = sortByDistance(
    allPlaces.filter((p) => p.category === "gym")
  ).slice(0, 10);
  const foodSpots = sortByDistance(
    allPlaces.filter((p) => p.category === "food")
  ).slice(0, 20);

  // Locked counts — what the paywall card describes
  const lockedCounts = {
    workSpots: Math.max(workSpots.length - FREE_WORK_SPOTS, 0),
    coworkings: Math.max(coworkings.length - FREE_COWORKINGS, 0),
    gyms: Math.max(gyms.length - FREE_GYMS, 0),
    foodSpots: Math.max(foodSpots.length - FREE_FOOD_SPOTS, 0),
  };
  const hasLockedContent = Object.values(lockedCounts).some((n) => n > 0);

  return (
    <div className="mt-10 space-y-8">
      {/* Summary cards — always visible */}
      <div className="grid gap-4 sm:grid-cols-2">
        <RoutineSummaryCard summary={summary} />
        <RecommendedAreaCard summary={summary} />
      </div>

      <PlaceSection
        title="Work spots"
        subtitle="Cafés and work-friendly spaces nearby"
        places={workSpots}
        freeCount={FREE_WORK_SPOTS}
        isUnlocked={isUnlocked}
        emptyMessage="No cafés found in this area based on OpenStreetMap data."
      />

      <PlaceSection
        title="Coworking backup"
        subtitle="Dedicated coworking spaces in range"
        places={coworkings}
        freeCount={FREE_COWORKINGS}
        isUnlocked={isUnlocked}
        emptyMessage="No coworking spaces found in this area. Cafés may be your best backup."
      />

      <PlaceSection
        title="Training"
        subtitle="Gyms and fitness centres nearby"
        places={gyms}
        freeCount={FREE_GYMS}
        isUnlocked={isUnlocked}
        emptyMessage="No gyms found in this area based on OpenStreetMap data."
      />

      <PlaceSection
        title="Food & coffee"
        subtitle="Restaurants and quick-meal options close by"
        places={foodSpots}
        freeCount={FREE_FOOD_SPOTS}
        isUnlocked={isUnlocked}
        emptyMessage="No food spots found in this area based on OpenStreetMap data."
      />

      {/* Paywall — shown only when locked and there is locked content */}
      {!isUnlocked && hasLockedContent && (
        <PaywallCard
          citySlug={city.slug}
          cityName={city.name}
          lockedCounts={lockedCounts}
        />
      )}

      <MethodologyNote />
    </div>
  );
}

function PlacesSkeleton() {
  return (
    <div className="mt-10 space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-stone-100"
        />
      ))}
    </div>
  );
}

function MethodologyNote() {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        About this data
      </p>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Place data is sourced from OpenStreetMap via Overpass API. Confidence
        signals are derived from venue category, proximity, and available tags —
        not from direct verification. Wi-Fi, noise, and work comfort ratings
        marked as &ldquo;unknown&rdquo; or &ldquo;not verified&rdquo; have not been tested.
        Results may be incomplete in less-mapped cities.
      </p>
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

function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-xs text-stone-400">Trustay</p>
      </div>
    </footer>
  );
}
