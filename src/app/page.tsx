import { CitySearch } from "@/components/CitySearch";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { HeroMap } from "@/components/HeroMap";
import { CountryDestinationsMap } from "@/components/CountryDestinationsMap";
import { getDb } from "@/db/client";
import { destinations } from "@/db/schema";
import { asc, isNotNull } from "drizzle-orm";
import {
  ACTIVITY_DESTINATIONS_BY_COUNTRY,
  type ActivityBucket,
} from "@/data/activityDestinations";

const ACTIVITY_BUCKETS: ActivityBucket[] = [
  "surf",
  "dive",
  "hike",
  "yoga",
  "kite",
  "work_first",
];

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
    body: "Enter your destination and shape your stay — surf + light work, focused remote, whatever your rhythm is. No account required.",
  },
  {
    n: "02",
    title: "Get your base recommendation",
    body: "TrustStay finds the best area for your kind of stay — with honest signals on work infrastructure, daily life, and what to plan around before you arrive.",
  },
  {
    n: "03",
    title: "Arrive knowing your setup",
    body: "Every work spot, café, and grocery ranked by distance from your base. No guessing, no day-one scrambling, no wasted first week.",
  },
];

const WHY_TRUSTAY = [
  {
    accent: "teal" as const,
    title: "Decision support, not discovery clutter",
    body: "We answer one question: where should you base yourself — and why that area fits your kind of stay.",
  },
  {
    accent: "teal" as const,
    title: "Honest signals, not fake certainty",
    body: "Wi-Fi and noise ratings are labeled as verified, likely, or unknown — never guaranteed.",
  },
  {
    accent: "coral" as const,
    title: "Built for preparation, not tourism",
    body: "Work spots, groceries, and daily essentials — everything you need to know before you arrive.",
  },
];

const FREE_FEATURES = [
  "Recommended base area for your destination",
  "Stay infrastructure score and coverage summary",
  "One work spot, café, and training option near your base",
];

const PASS_FEATURES = [
  "Your full base recommendation — why it fits, what to plan around",
  "All ranked micro-areas for your destination (not just the top base)",
  "Every work spot, café, and wellbeing option sorted by distance",
  "Hours, ratings, and Maps links for each place",
  "Honest wifi, noise, and work-fit signals per place",
];

const BUNDLE_FEATURES = [
  "Launching first in cities with complete micro-area coverage",
  "Compare every micro-area in the city side by side",
  "Join waitlist for early access rollout",
];

export default async function HomePage() {
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
        .filter((d) => d.lat != null && d.lon != null)
        .map((d) => ({
          slug: d.slug,
          name: d.name,
          country: d.country,
          lat: d.lat as number,
          lon: d.lon as number,
          activities: SLUG_ACTIVITIES.get(d.slug) ?? [],
          activity: (SLUG_ACTIVITIES.get(d.slug) ?? []).includes("surf")
            ? ("surf" as const)
            : ("other" as const),
        }))
    : [];

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
                    For remote workers who travel with a purpose
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-bark sm:text-5xl lg:text-[52px]">
                  Know where to base yourself{" "}
                  <span className="text-coral">before you land.</span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-umber">
                  You already chose the place. TrustStay helps you find
                  your best base, understand daily life, and know what to
                  plan around — before you arrive.
                </p>

                <div className="mt-8">
                  <CitySearch />
                </div>

                <p className="mt-5 text-xs text-umber">
                  Free preview · No account required
                </p>

              </div>
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
              Why Truststay
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {WHY_TRUSTAY.map(({ accent, title, body }) => (
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

        {/* ── Pricing ── white ────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              What&rsquo;s included
            </p>
            <p className="mt-2 text-sm text-umber">
              Start free. Unlock your full setup when you&rsquo;re ready.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
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

              {/* Stay Setup */}
              <div className="flex flex-col rounded-2xl bg-bark p-6 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Stay Setup
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

              {/* Full City Setup */}
              <div className="flex flex-col rounded-2xl border border-[#8FB7B3] bg-[#DCEBE9] p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F5A54]">
                    Full City Setup
                  </p>
                  <span className="rounded-full border border-[#8FB7B3] bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-[#5F5A54]">
                    Coming soon
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-bark">
                  ${process.env.NEXT_PUBLIC_CITY_BUNDLE_PRICE ?? "15"}
                </p>
                <p className="mt-1 text-xs text-[#5F5A54]">Rolling out city by city</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {BUNDLE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-6 text-[#2E2A26]"
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-[#8FB7B3]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs text-[#5F5A54]">
                  I&rsquo;m rolling this out as destination coverage reaches quality thresholds.
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm text-umber">
              No account required. No subscription. Pay once, access forever.
            </p>
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

