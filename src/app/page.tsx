import { CitySearch } from "@/components/CitySearch";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";

const POPULAR_CITIES = [
  { label: "Medellín", slug: "medellin" },
  { label: "Lisbon", slug: "lisbon" },
  { label: "Chiang Mai", slug: "chiang-mai" },
  { label: "Bali", slug: "bali" },
  { label: "Barcelona", slug: "barcelona" },
  { label: "Mexico City", slug: "mexico-city" },
  { label: "Buenos Aires", slug: "buenos-aires" },
  { label: "Bangkok", slug: "bangkok" },
  { label: "Berlin", slug: "berlin" },
  { label: "Tbilisi", slug: "tbilisi" },
];

const SURF_NATURE_DESTINATIONS = [
  { label: "Puerto Escondido", slug: "puerto-escondido" },
  { label: "Santa Teresa", slug: "santa-teresa" },
  { label: "Nosara", slug: "nosara" },
  { label: "Popoyo", slug: "popoyo" },
  { label: "Antigua Guatemala", slug: "antigua-guatemala" },
  { label: "Boquete", slug: "boquete" },
  { label: "Jericoacoara", slug: "jericoacoara" },
  { label: "Itacaré", slug: "itacare" },
  { label: "Montañita", slug: "montanita" },
  { label: "Baños", slug: "banos" },
  { label: "Minca", slug: "minca" },
  { label: "Máncora", slug: "mancora" },
  { label: "Sayulita", slug: "sayulita" },
  { label: "El Zonte", slug: "el-zonte" },
  { label: "Bocas del Toro", slug: "bocas-del-toro" },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Search a city",
    body: "Enter any city where you plan to spend time as a remote worker.",
  },
  {
    n: "02",
    title: "Get a recommended area",
    body: "We analyze work spots, gyms, and food options to suggest a practical base area.",
  },
  {
    n: "03",
    title: "Read honest confidence signals",
    body: "Every place shows what we know and what we don't — no fake certainty.",
  },
];

const WHY_TRUSTAY = [
  {
    accent: "teal" as const,
    title: "Decision support, not discovery clutter",
    body: "We answer one question: where should you base yourself to get functional fast.",
  },
  {
    accent: "teal" as const,
    title: "Honest signals, not fake certainty",
    body: "Wi-Fi and noise ratings are labeled as verified, likely, or unknown — never guaranteed.",
  },
  {
    accent: "coral" as const,
    title: "Built for routine, not tourism",
    body: "Work spots, gyms, and food options that support a repeatable daily rhythm.",
  },
];

const FREE_FEATURES = [
  "Neighborhood grid for major cities",
  "Routine score and suggested base area",
  "Top picks per category (work, coffee, training)",
];

const PASS_FEATURES = [
  "Full place lists for one neighborhood",
  "Ratings, hours, and Maps links",
  "Confidence breakdown per place",
];

const BUNDLE_FEATURES = [
  "All neighborhoods in a city unlocked",
  "Everything in the Neighborhood Pass",
  "One payment — explore freely",
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="border-b border-dune bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-bark">
            Trusts<span className="text-teal">tay</span>
          </span>
          <span className="hidden sm:block text-xs text-umber">
            Remote worker city setup
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── sand surface, white inner card ──────────── */}
        <section className="border-b border-dune bg-sand">
          <div className="mx-auto max-w-4xl px-6 py-8 sm:py-14">
            <div className="rounded-3xl border border-dune bg-white shadow-sm overflow-hidden">
              <div className="grid lg:grid-cols-[1fr_360px]">

                {/* Left — content ───────────────────────────── */}
                <div className="px-8 py-10 sm:px-12 sm:py-14">
                  {/* Eyebrow */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-dune bg-cream px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                    <span className="text-xs font-medium text-umber">
                      Built for remote workers on the move
                    </span>
                  </div>

                  <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-bark sm:text-5xl lg:text-[52px]">
                    Land in a new city.
                    <br />
                    Keep your routine{" "}
                    <span className="text-coral">from day one.</span>
                  </h1>

                  <p className="mt-5 max-w-md text-base leading-7 text-umber">
                    Find a base area, places to work, nearby coffee and meal
                    spots, and wellbeing options that fit your day — without
                    wasting your first days figuring it all out.
                  </p>

                  <div className="mt-8">
                    <CitySearch />
                  </div>

                  <p className="mt-5 text-xs text-umber">
                    Free preview · No account required
                  </p>
                </div>

                {/* Right — live map preview (desktop only) ───── */}
                <div className="hidden lg:block border-l border-dune overflow-hidden">
                  <HeroMapImage />
                </div>

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

        {/* ── Popular destinations ── sand ─────────────────────── */}
        <section className="border-b border-dune bg-sand">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Popular destinations
            </p>
            <p className="mt-2 text-sm text-umber">
              Jump straight in — or search any city above.
            </p>

            {/* Cities */}
            <div className="mt-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-umber/60">
                Cities
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CITIES.map(({ label, slug }) => (
                  <a
                    key={slug}
                    href={`/city/${slug}`}
                    className="rounded-full border border-dune bg-white px-3.5 py-1.5 text-sm font-medium text-bark transition-colors hover:border-teal/50 hover:bg-mist hover:text-teal"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Surf & nature */}
            <div className="mt-7">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-umber/60">
                Surf &amp; nature
              </p>
              <div className="flex flex-wrap gap-2">
                {SURF_NATURE_DESTINATIONS.map(({ label, slug }) => (
                  <a
                    key={slug}
                    href={`/city/${slug}`}
                    className="rounded-full border border-dune bg-white px-3.5 py-1.5 text-sm font-medium text-bark transition-colors hover:border-coral/50 hover:bg-[#FDF3EF] hover:text-coral"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
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
              Pricing
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
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

              {/* Neighborhood Pass */}
              <div className="flex flex-col rounded-2xl bg-bark p-6 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    Neighborhood Pass
                  </p>
                  <span className="rounded-full bg-teal px-2.5 py-0.5 text-xs font-semibold text-white">
                    Popular
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  ${process.env.NEXT_PUBLIC_CITY_PASS_PRICE ?? "5"}
                </p>
                <p className="mt-1 text-xs text-white/60">One-time per neighborhood</p>
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

              {/* City Bundle */}
              <div className="flex flex-col rounded-2xl border border-[#8FB7B3] bg-[#DCEBE9] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5F5A54]">
                  City Bundle
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-bark">
                  ${process.env.NEXT_PUBLIC_CITY_BUNDLE_PRICE ?? "15"}
                </p>
                <p className="mt-1 text-xs text-[#5F5A54]">All neighborhoods, one city</p>
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
            Truststay — built for remote workers who need to get functional fast.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Hero map image — Mapbox Static Images API ─────────────────────────────
// Server component — zero JS, just an <img> pointing at the Static API.
// Shows a real Mapbox light map of Lisbon with brand-colored demo pins.

function HeroMapImage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  // Demo pins around Bairro Alto / Príncipe Real, Lisbon
  // Colors use Truststay brand palette (hex without #)
  const markers = [
    "pin-l+2e2a26(-9.1433,38.7115)",  // base area — dark bark
    "pin-s+8fb7b3(-9.1503,38.7161)",  // work — teal
    "pin-s+8fb7b3(-9.1391,38.7107)",  // work — teal
    "pin-s+c07a58(-9.1400,38.7157)",  // coffee & meals — terracotta
    "pin-s+c07a58(-9.1354,38.7199)",  // coffee & meals — terracotta
    "pin-s+b99b6b(-9.1543,38.7139)",  // wellbeing — amber
    "pin-s+c8c3bc(-9.1516,38.7073)",  // locked — grey
    "pin-s+c8c3bc(-9.1333,38.7177)",  // locked — grey
  ].join(",");

  const src =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
    `${markers}/-9.143,38.715,13.2,0/360x480@2x?access_token=${token}`;

  return (
    <div className="relative h-full min-h-[420px]">
      <img
        src={src}
        alt="Routine map preview — Lisbon"
        className="w-full h-full object-cover"
        loading="eager"
      />

      {/* City label — top-left */}
      <div className="absolute top-4 left-4 rounded-lg border border-dune bg-white/90 backdrop-blur-sm px-3 py-1.5">
        <p className="text-[10px] font-semibold text-bark leading-none">Lisbon</p>
        <p className="mt-0.5 text-[9px] text-umber leading-none">live example</p>
      </div>

      {/* Category legend — bottom-left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2">
        <HeroLegendDot color="#8FB7B3" label="Work" />
        <HeroLegendDot color="#C07A58" label="Coffee & meals" />
        <HeroLegendDot color="#B99B6B" label="Wellbeing" />
      </div>
    </div>
  );
}

function HeroLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: color }}
      />
      <span className="text-[10px] leading-none text-umber">{label}</span>
    </div>
  );
}
