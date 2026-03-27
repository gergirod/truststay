import { CitySearch } from "@/components/CitySearch";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { HeroMap } from "@/components/HeroMap";

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  "Surf":             { icon: "🏄", description: "Pacific breaks · reef points · beach towns" },
  "Dive":             { icon: "🤿", description: "Reefs · walls · cenotes · marine parks" },
  "Hike":             { icon: "⛰️", description: "Volcanoes · cloud forests · Andean circuits" },
  "Yoga & wellness":  { icon: "🧘", description: "Retreat towns · slow living · recovery" },
  "Kite & wind":      { icon: "🪁", description: "Trade winds · lagoons · flat water" },
  "Remote work hubs": { icon: "💻", description: "Coworkings · fast wifi · expat community" },
};

const DESTINATION_CATEGORIES = [
  {
    label: "Surf",
    destinations: [
      { label: "Puerto Escondido", slug: "puerto-escondido" },
      { label: "Santa Teresa", slug: "santa-teresa" },
      { label: "Nosara", slug: "nosara" },
      { label: "Popoyo", slug: "popoyo" },
      { label: "Sayulita", slug: "sayulita" },
      { label: "El Tunco", slug: "el-tunco" },
      { label: "El Zonte", slug: "el-zonte" },
      { label: "Tamarindo", slug: "tamarindo" },
      { label: "Dominical", slug: "dominical" },
      { label: "El Paredon", slug: "el-paredon" },
      { label: "Pavones", slug: "pavones" },
      { label: "Jericoacoara", slug: "jericoacoara" },
      { label: "Itacaré", slug: "itacare" },
      { label: "Pipa", slug: "pipa" },
      { label: "Montañita", slug: "montanita" },
      { label: "Máncora", slug: "mancora" },
      { label: "Chicama", slug: "chicama" },
      { label: "Lobitos", slug: "lobitos" },
      { label: "Huanchaco", slug: "huanchaco" },
      { label: "Pichilemu", slug: "pichilemu" },
      { label: "Tulum", slug: "tulum" },
      { label: "Mazunte", slug: "mazunte" },
      { label: "Gigante", slug: "gigante" },
    ],
  },
  {
    label: "Dive",
    destinations: [
      { label: "Cozumel", slug: "cozumel" },
      { label: "Isla Mujeres", slug: "isla-mujeres" },
      { label: "Roatán", slug: "roatan" },
      { label: "Utila", slug: "utila" },
      { label: "Caye Caulker", slug: "caye-caulker" },
      { label: "San Pedro", slug: "san-pedro-belize" },
      { label: "Bocas del Toro", slug: "bocas-del-toro" },
      { label: "Coiba", slug: "coiba" },
      { label: "Taganga", slug: "taganga" },
      { label: "San Andrés", slug: "san-andres" },
      { label: "Bonito", slug: "bonito" },
    ],
  },
  {
    label: "Hike",
    destinations: [
      { label: "Lago Atitlán", slug: "lago-atitlan" },
      { label: "Acatenango", slug: "acatenango" },
      { label: "Antigua Guatemala", slug: "antigua-guatemala" },
      { label: "Ometepe", slug: "ometepe" },
      { label: "Boquete", slug: "boquete" },
      { label: "El Valle de Antón", slug: "el-valle-de-anton" },
      { label: "Monteverde", slug: "monteverde" },
      { label: "Arenal", slug: "arenal" },
      { label: "Minca", slug: "minca" },
      { label: "Baños", slug: "banos" },
      { label: "Quilotoa", slug: "quilotoa" },
      { label: "Huaraz", slug: "huaraz" },
      { label: "Ollantaytambo", slug: "ollantaytambo" },
      { label: "Lençóis", slug: "lencois" },
      { label: "Bariloche", slug: "bariloche" },
      { label: "Pucón", slug: "pucon" },
      { label: "Puerto Natales", slug: "puerto-natales" },
      { label: "El Chaltén", slug: "el-chalten" },
      { label: "Jujuy", slug: "jujuy" },
      { label: "Copán Ruinas", slug: "copan-ruinas" },
    ],
  },
  {
    label: "Yoga & wellness",
    destinations: [
      { label: "San Marcos La Laguna", slug: "san-marcos-la-laguna" },
      { label: "Nosara", slug: "nosara" },
      { label: "Montezuma", slug: "montezuma" },
      { label: "Puerto Viejo", slug: "puerto-viejo" },
      { label: "Bacalar", slug: "bacalar" },
      { label: "Vilcabamba", slug: "vilcabamba" },
      { label: "Pisac", slug: "pisac" },
      { label: "Mindo", slug: "mindo" },
      { label: "Palomino", slug: "palomino" },
    ],
  },
  {
    label: "Kite & wind",
    destinations: [
      { label: "Cabarete", slug: "cabarete" },
      { label: "Cumbuco", slug: "cumbuco" },
      { label: "São Miguel do Gostoso", slug: "sao-miguel-do-gostoso" },
      { label: "Cabo de la Vela", slug: "cabo-de-la-vela" },
      { label: "Iquique", slug: "iquique" },
    ],
  },
  {
    label: "Remote work hubs",
    destinations: [
      { label: "Medellín", slug: "medellin" },
      { label: "Bogotá", slug: "bogota" },
      { label: "Buenos Aires", slug: "buenos-aires" },
      { label: "Montevideo", slug: "montevideo" },
      { label: "Mexico City", slug: "mexico-city" },
      { label: "Panama City", slug: "panama-city" },
      { label: "Lima", slug: "lima" },
      { label: "Santiago", slug: "santiago" },
      { label: "São Paulo", slug: "sao-paulo" },
      { label: "Rio de Janeiro", slug: "rio-de-janeiro" },
      { label: "Florianópolis", slug: "florianopolis" },
      { label: "Fortaleza", slug: "fortaleza" },
      { label: "Playa del Carmen", slug: "playa-del-carmen" },
      { label: "Oaxaca", slug: "oaxaca" },
      { label: "San Cristóbal", slug: "san-cristobal-de-las-casas" },
      { label: "Quito", slug: "quito" },
      { label: "Cuenca", slug: "cuenca" },
      { label: "Valparaíso", slug: "valparaiso" },
      { label: "Cartagena", slug: "cartagena" },
      { label: "Santa Marta", slug: "santa-marta" },
      { label: "Salento", slug: "salento" },
      { label: "Cozumel", slug: "cozumel" },
      { label: "Las Terrenas", slug: "las-terrenas" },
      { label: "Paraty", slug: "paraty" },
      { label: "Granada", slug: "granada" },
      { label: "Sucre", slug: "sucre" },
    ],
  },
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Search any spot",
    body: "Enter any city, surf town, or activity destination where you plan to spend time.",
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
  "All neighborhoods in one spot unlocked",
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
            Remote work setup
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── map fills everything, glass card floats on top ─ */}
        <section className="relative border-b border-dune bg-sand overflow-hidden" style={{ minHeight: "600px" }}>

          {/* Full-bleed map background — single instance, all screen sizes */}
          <div className="absolute inset-0 z-0">
            <HeroMap />
          </div>

          {/* Glass content card — floats above map */}
          <div className="relative z-10 mx-auto max-w-4xl px-6 py-10 sm:py-16 flex items-center justify-center min-h-[600px]">
            <div className="w-full max-w-[640px] rounded-3xl border border-white/20 bg-white/85 shadow-2xl overflow-hidden backdrop-blur-none">
              <div className="px-8 py-10 sm:px-12 sm:py-14">

                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2 rounded-full border border-dune bg-white/70 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  <span className="text-xs font-medium text-umber">
                    For remote workers who travel with a purpose
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-bark sm:text-5xl lg:text-[52px]">
                  Land in a new spot.
                  <br />
                  Keep your routine{" "}
                  <span className="text-coral">from day one.</span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-umber">
                  Whether you're surfing at 6am, hiking at dawn, or just
                  need everything walkable — find your base area, work
                  spots, food, and wellbeing options before you arrive.
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

        {/* ── Popular destinations ── sand ─────────────────────── */}
        <section className="border-b border-dune bg-sand overflow-hidden">
          <div className="mx-auto max-w-4xl px-6 pt-20 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Popular destinations
            </p>
            <p className="mt-2 text-sm text-umber">
              Jump straight in — or search any spot above.
            </p>
          </div>

          {DESTINATION_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat.label];
            return (
              <div key={cat.label} className="mb-8">
                {/* Category header — inside the max-width container */}
                <div className="mx-auto max-w-4xl px-6 mb-3 flex items-center gap-3">
                  <span className="text-xl leading-none">{meta?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-bark">{cat.label}</p>
                    {meta?.description && (
                      <p className="text-xs text-umber/60">{meta.description}</p>
                    )}
                  </div>
                </div>

                {/* Scrollable pill row — bleeds edge to edge */}
                <div className="relative">
                  <div className="flex gap-2 overflow-x-auto scroll-smooth px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingLeft: "max(24px, calc((100vw - 896px) / 2 + 24px))" }}>
                    {cat.destinations.map(({ label, slug }) => (
                      <a
                        key={slug}
                        href={`/city/${slug}`}
                        className="flex-shrink-0 rounded-full border border-dune bg-white px-4 py-2 text-sm font-medium text-bark transition-colors hover:border-coral/50 hover:bg-[#FDF3EF] hover:text-coral"
                      >
                        {label}
                      </a>
                    ))}
                    {/* Right spacer so last pill doesn't butt against edge */}
                    <span className="flex-shrink-0 w-6" />
                  </div>
                  {/* Fade hint — right edge */}
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-sand to-transparent" />
                </div>
              </div>
            );
          })}

          <div className="pb-16" />
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
                <p className="mt-1 text-xs text-[#5F5A54]">All neighborhoods, one spot</p>
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

