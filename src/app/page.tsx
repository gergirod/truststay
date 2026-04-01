import { CitySearch } from "@/components/CitySearch";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { HeroMap } from "@/components/HeroMap";
import { CountryDestinationsMap } from "@/components/CountryDestinationsMap";
import { getDb } from "@/db/client";
import { destinations } from "@/db/schema";
import { asc, isNotNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { BUNDLE_COOKIE, UNLOCK_COOKIE, parseSlugs } from "@/lib/unlock";
import {
  ACTIVITY_DESTINATIONS_BY_COUNTRY,
  getCanonicalDestinationMeta,
  type ActivityBucket,
} from "@/data/activityDestinations";
import { DESTINATION_PINS } from "@/data/destinationCoords";

const ACTIVITY_BUCKETS: ActivityBucket[] = [
  "surf",
  "dive",
  "hike",
  "yoga",
  "kite",
  "work_first",
];

const DESTINATION_COORDS_BY_SLUG = new Map(
  DESTINATION_PINS.map((pin) => [pin.slug, { lat: pin.lat, lon: pin.lon }]),
);

const HOME_MAP_COORD_WARN_THRESHOLD_KM = 60;

const SLUG_ACTIVITIES = (() => {
  const map = new Map<string, ActivityBucket[]>();
  for (const activity of ACTIVITY_BUCKETS) {
    const slugs = Object.values(ACTIVITY_DESTINATIONS_BY_COUNTRY[activity])
      .flat()
      .map((d) => d.slug);
    for (const slug of slugs) {
      const current = map.get(slug) ?? [];
      if (!current.includes(activity)) current.push(activity);
      map.set(slug, current);
    }
  }
  return map;
})();

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Tell us where you're going and how you work",
    body: "Choose your destination and stay style — focused remote work, light work + surf, or a more balanced rhythm.",
  },
  {
    n: "02",
    title: "Get your best base area",
    body: "TrustStay recommends the area that best fits your work setup, daily routine, and the tradeoffs you're okay with.",
  },
  {
    n: "03",
    title: "Arrive with your setup already mapped",
    body: "See work cafés, groceries, training options, and practical tradeoffs before arrival — not after a bad booking.",
  },
];

const WHY_TRUSTSTAY = [
  {
    accent: "teal" as const,
    title: "Neighborhood-first, not city-first",
    body: "Most guides tell you where to go. TrustStay tells you where to base yourself inside the place you already chose.",
  },
  {
    accent: "teal" as const,
    title: "Built for routine, not tourism",
    body: "We focus on what remote workers need to function fast: work spots, food, groceries, movement, and daily logistics.",
  },
  {
    accent: "coral" as const,
    title: "Honest signals, not fake guarantees",
    body: "Wi-Fi and noise are labeled as verified, likely, or unknown. We avoid fake certainty.",
  },
  {
    accent: "coral" as const,
    title: "Faster than doing it manually",
    body: "Instead of bouncing between Maps, Airbnb reviews, blogs, and Reddit, you get one structured base decision before arrival.",
  },
];

const PAIN_CHIPS = [
  "Wi-Fi confidence",
  "Noise signals",
  "Work cafés nearby",
  "Gym / training options",
  "Groceries & essentials",
  "Walkability",
];

const PAIN_CARDS = [
  {
    title: "Bad work setup",
    body: "Weak Wi-Fi, poor cafés, and no comfortable fallback when your Airbnb setup fails.",
  },
  {
    title: "Routine friction",
    body: "Groceries, food, gym, and work spots too far from where you stay.",
  },
  {
    title: "Wasted first week",
    body: "You land, realize the area is wrong, and lose days rebuilding your setup.",
  },
];

const FREE_FEATURES = [
  "Best recommended base area",
  "Coverage snapshot",
  "1 work spot",
  "1 café",
  "1 training option",
];

const PASS_FEATURES = [
  "Why this base fits your stay",
  "All ranked micro-areas",
  "All cafés, work spots, and wellbeing options by distance",
  "Maps links, hours, ratings",
  "Wi-Fi confidence, noise, and work-fit signals",
  "Lifetime access for that area",
];

const MANUAL_RESEARCH_STEPS = [
  "Scanning Airbnb reviews for Wi-Fi clues",
  "Checking random cafés on Maps",
  "Guessing if an area is noisy",
  "Trying to find gym and groceries nearby",
  "Reading scattered Reddit threads",
  "Hoping it all works when you arrive",
];

const TRUST_CHECKLIST = [
  "Base-area fit",
  "Work cafés nearby",
  "Coworking / laptop-friendly spots",
  "Groceries / essentials",
  "Training / movement options",
  "Wi-Fi confidence",
  "Noise confidence",
  "Distance from your base",
];

const FAQS = [
  {
    q: "Is TrustStay for booking accommodation?",
    a: "No. TrustStay helps you decide which neighborhood or base area fits your stay before you book.",
  },
  {
    q: "Does TrustStay guarantee Wi-Fi or noise?",
    a: "No. Signals are labeled honestly as verified, likely, or unknown.",
  },
  {
    q: "Who is TrustStay for?",
    a: "Remote workers staying for multiple days or weeks who care about workability, routine, and daily setup.",
  },
  {
    q: "Why not just use Google Maps and Airbnb reviews?",
    a: "You can, but it's slow and still leaves gaps. TrustStay gives you one structured neighborhood decision before arrival.",
  },
];

function slugToDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const unlockedRaw = cookieStore.get(UNLOCK_COOKIE)?.value ?? "";
  const bundlesRaw = cookieStore.get(BUNDLE_COOKIE)?.value ?? "";
  const unlockedSlugs = parseSlugs(unlockedRaw);
  const bundleSlugs = parseSlugs(bundlesRaw);
  const unlockedSet = new Set([...unlockedSlugs, ...bundleSlugs]);

  const db = getDb();
  const browseDestinations = db
    ? (
        await db
          .select({
            slug: destinations.slug,
            name: destinations.name,
            country: destinations.country,
            lat: destinations.anchorLat,
            lon: destinations.anchorLon,
          })
          .from(destinations)
          .where(
            isNotNull(destinations.anchorLat),
          )
          .orderBy(asc(destinations.name))
      )
        .map((d) => {
          const canonical = getCanonicalDestinationMeta(d.slug);
          const fallback = DESTINATION_COORDS_BY_SLUG.get(d.slug);
          const hasDbCoords = d.lat != null && d.lon != null;
          if (!hasDbCoords && !fallback) return null;

          const dbLat = hasDbCoords ? (d.lat as number) : null;
          const dbLon = hasDbCoords ? (d.lon as number) : null;

          // Landing map should favor curated destination pins, while destination pages
          // can still use dynamic geocoded anchors for deeper calculations.
          const resolvedLat = fallback?.lat ?? dbLat ?? 0;
          const resolvedLon = fallback?.lon ?? dbLon ?? 0;

          if (fallback && dbLat != null && dbLon != null) {
            const driftKm = haversineKm(dbLat, dbLon, fallback.lat, fallback.lon);
            if (driftKm > HOME_MAP_COORD_WARN_THRESHOLD_KM) {
              console.warn(
                `[home-map] large coord drift for ${d.slug}: db=(${dbLat.toFixed(4)},${dbLon.toFixed(4)}) fallback=(${fallback.lat.toFixed(4)},${fallback.lon.toFixed(4)}) driftKm=${driftKm.toFixed(0)}; using curated fallback`,
              );
            }
          }

          return {
            slug: d.slug,
            name: canonical?.name ?? d.name,
            country: canonical?.country ?? d.country,
            lat: resolvedLat,
            lon: resolvedLon,
            activities: SLUG_ACTIVITIES.get(d.slug) ?? [],
            activity: (SLUG_ACTIVITIES.get(d.slug) ?? []).includes("surf")
              ? ("surf" as const)
              : ("other" as const),
          };
        })
        .filter((d): d is NonNullable<typeof d> => Boolean(d))
    : [];
  const destinationNameBySlug = new Map(
    browseDestinations.map((d) => [d.slug, d.name]),
  );
  const unlockedItems = [...unlockedSet]
    .sort((a, b) => a.localeCompare(b))
    .map((slug) => ({
      slug,
      name: destinationNameBySlug.get(slug) ?? slugToDisplayName(slug),
      isBundle: bundleSlugs.includes(slug),
    }));

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b border-dune bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-bark">
            Trusts<span className="text-teal">tay</span>
          </span>
          <span className="hidden sm:block text-xs text-umber">
            Remote work setup
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── map fills everything, glass card floats on top ─ */}
        <section className="relative border-b border-dune bg-sand min-h-[600px]">

          {/* Full-bleed map background */}
          <div className="absolute inset-0 z-0">
            <HeroMap />
          </div>

          {/* Glass content card */}
          <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 sm:py-24 flex items-center justify-center">
            <div className="w-full max-w-[600px] rounded-3xl border border-white/20 bg-white/85 shadow-2xl backdrop-blur-none">
              <div className="px-8 py-8 sm:px-12 sm:py-12">

                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 rounded-full border border-dune bg-white/70 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  <span className="text-xs font-medium text-umber">
                    For remote workers booking multi-week stays
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-bark sm:text-5xl lg:text-[52px]">
                  Choose the right neighborhood{" "}
                  <span className="text-coral">before you book the wrong one.</span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-umber">
                  TrustStay helps remote workers find the best base area for their stay with honest signals on Wi-Fi, noise, daily logistics, and routine fit before arrival.
                </p>

                <div className="mt-8">
                  <CitySearch />
                </div>

                <p className="mt-5 text-xs text-umber">
                  Find my best base · Free preview · No account required
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PAIN_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-dune bg-white/80 px-2.5 py-1 text-[11px] text-umber"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

              </div>
            </div>
          </div>

        </section>

        {/* ── Pain-first block ─────────────────────────────────── */}
        <section className="border-b border-dune bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Why picking the wrong area hurts
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-umber">
              The city may be right. The neighborhood may be wrong. A bad base can mean unreliable Wi-Fi, noisy surroundings, weak work fallback options, long daily logistics, and a first week spent fixing your life instead of working.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {PAIN_CARDS.map((card) => (
                <div key={card.title} className="rounded-2xl border border-dune bg-sand p-5">
                  <h3 className="text-sm font-semibold text-bark">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-umber">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── white ───────────────────────────── */}
        <section className="border-b border-dune bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              How it works
            </p>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {HOW_IT_WORKS.map(({ n, title, body }) => (
                <div key={n} className="border-l-2 border-teal/30 pl-5 sm:border-l-0 sm:pl-0">
                  <span className="block text-5xl font-bold leading-none tracking-tight text-teal/20 tabular-nums">
                    {n}
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-bark">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-umber">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── My unlocked stays ─────────────────────────────────── */}
        {unlockedItems.length > 0 && (
          <section className="border-b border-dune bg-white">
            <div className="mx-auto max-w-4xl px-6 py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
                My unlocked stays
              </p>
              <p className="mt-2 text-sm text-umber">
                Quick access to destinations you already unlocked.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {unlockedItems.map((item) => (
                  <a
                    key={item.slug}
                    href={`/city/${item.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-dune bg-sand px-3 py-1.5 text-xs font-medium text-bark transition-colors hover:border-teal/50 hover:bg-mist"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    <span>{item.name}</span>
                    {item.isBundle && (
                      <span className="rounded-full bg-[#DCEBE9] px-2 py-0.5 text-[10px] font-semibold text-[#2E2A26]">
                        bundle
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Coverage ── sand ─────────────────────────────────── */}
        <section className="border-b border-dune bg-sand">
          <div className="mx-auto max-w-4xl px-6 pt-14 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Coverage
            </p>
            <p className="mt-2 text-sm text-umber">
              Explore all mapped destinations in LATAM, Caribbean, and Central America. Filter by activity.
            </p>
          </div>
          <div className="w-full pb-10">
            <CountryDestinationsMap destinations={browseDestinations} />
          </div>
        </section>

        {/* ── Why Truststay ── sand ─────────────────────────────── */}
        <section className="border-b border-dune bg-sand">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Why TrustStay is better than guessing
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {WHY_TRUSTSTAY.map(({ accent, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-dune bg-white p-5"
                >
                  <span
                    className={`inline-block h-1.5 w-8 rounded-full mb-4 ${
                      accent === "coral" ? "bg-coral" : "bg-teal"
                    }`}
                  />
                  <h3 className="text-sm font-semibold text-bark">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-umber">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Manual research contrast ─────────────────────────── */}
        <section className="border-b border-dune bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Most people do this the hard way
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-umber">
              Choosing where to stay often means stitching together Airbnb comments, Maps checks, and random threads. TrustStay turns that into one decision: where should I base myself, and why?
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {MANUAL_RESEARCH_STEPS.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-umber">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-coral" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust checklist ──────────────────────────────────── */}
        <section className="border-b border-dune bg-sand">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              What TrustStay evaluates before you arrive
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {TRUST_CHECKLIST.map((item) => (
                <div key={item} className="rounded-xl border border-dune bg-white px-4 py-3 text-sm text-bark">
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-umber">
              Signals are shown as verified, likely, or unknown where applicable.
            </p>
          </div>
        </section>

        {/* ── Pricing ── white ────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              What&rsquo;s included
            </p>
            <p className="mt-2 text-sm text-umber">
              Start free. Unlock your full setup when you&rsquo;re ready.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {/* Free tier */}
              <div className="flex flex-col rounded-2xl border border-dune bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
                  Free
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-bark">
                  $0
                </p>
                <p className="mt-1 text-xs text-umber">Always</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-6 text-umber"
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-dune" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unlock Full Setup */}
              <div className="flex flex-col rounded-2xl bg-bark p-6 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Unlock Full Setup
                  </p>
                  <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  ${process.env.NEXT_PUBLIC_CITY_PASS_PRICE ?? "5"}
                </p>
                <p className="mt-1 text-xs text-white/60">One-time per area</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {PASS_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-6 text-white/70"
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-teal" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            <p className="mt-6 text-sm text-umber">
              Pay once for this area. No subscription.
            </p>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              FAQ
            </p>
            <div className="mt-6 space-y-3">
              {FAQS.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-dune bg-sand p-5">
                  <h3 className="text-sm font-semibold text-bark">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-umber">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <AnalyticsEvent event="homepage_viewed" />

      {/* ── Footer ── white ──────────────────────────────────── */}
      <footer className="border-t border-dune bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-umber">
            TrustStay — know your base before you arrive.
          </p>
        </div>
      </footer>
    </div>
  );
}

