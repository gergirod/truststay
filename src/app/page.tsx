import { CitySearch } from "@/components/CitySearch";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { HeroMap } from "@/components/HeroMap";
import { DestinationPill } from "@/components/DestinationPill";
import { DestinationsMap } from "@/components/DestinationsMap";

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
      // Mexico
      { label: "Puerto Escondido", slug: "puerto-escondido" },
      { label: "Sayulita", slug: "sayulita" },
      { label: "Troncones", slug: "troncones" },
      { label: "Todos Santos", slug: "todos-santos" },
      { label: "Mazunte", slug: "mazunte" },
      { label: "Tulum", slug: "tulum" },
      // Central America
      { label: "El Tunco", slug: "el-tunco" },
      { label: "El Zonte", slug: "el-zonte" },
      { label: "Popoyo", slug: "popoyo" },
      { label: "Gigante", slug: "gigante" },
      { label: "San Juan del Sur", slug: "san-juan-del-sur" },
      { label: "El Paredon", slug: "el-paredon" },
      { label: "Santa Teresa", slug: "santa-teresa" },
      { label: "Nosara", slug: "nosara" },
      { label: "Tamarindo", slug: "tamarindo" },
      { label: "Dominical", slug: "dominical" },
      { label: "Jacó", slug: "jaco" },
      { label: "Pavones", slug: "pavones" },
      { label: "Santa Catalina", slug: "santa-catalina" },
      { label: "Playa Venao", slug: "playa-venao" },
      // Caribbean
      { label: "Rincón", slug: "rincon" },
      { label: "Martinique", slug: "martinique" },
      { label: "Barbados", slug: "barbados" },
      { label: "Guadeloupe", slug: "guadeloupe" },
      // South America
      { label: "Montañita", slug: "montanita" },
      { label: "Canoa", slug: "canoa" },
      { label: "Ayampe", slug: "ayampe" },
      { label: "Máncora", slug: "mancora" },
      { label: "Lobitos", slug: "lobitos" },
      { label: "Chicama", slug: "chicama" },
      { label: "Huanchaco", slug: "huanchaco" },
      { label: "Jericoacoara", slug: "jericoacoara" },
      { label: "Itacaré", slug: "itacare" },
      { label: "Pipa", slug: "pipa" },
      { label: "Arraial do Cabo", slug: "arraial-do-cabo" },
      { label: "Praia do Rosa", slug: "praia-do-rosa" },
      { label: "Punta del Diablo", slug: "punta-del-diablo" },
      { label: "Pichilemu", slug: "pichilemu" },
    ],
  },
  {
    label: "Dive",
    destinations: [
      // Mexico
      { label: "Cozumel", slug: "cozumel" },
      { label: "Isla Mujeres", slug: "isla-mujeres" },
      { label: "Playa del Carmen", slug: "playa-del-carmen" },
      { label: "Mahahual", slug: "mahahual" },
      { label: "Huatulco", slug: "huatulco" },
      // Central America
      { label: "Roatán", slug: "roatan" },
      { label: "Utila", slug: "utila" },
      { label: "Caye Caulker", slug: "caye-caulker" },
      { label: "San Pedro", slug: "san-pedro-belize" },
      { label: "Placencia", slug: "placencia" },
      { label: "Bocas del Toro", slug: "bocas-del-toro" },
      { label: "Coiba", slug: "coiba" },
      { label: "Cahuita", slug: "cahuita" },
      // Caribbean / Colombia
      { label: "San Andrés", slug: "san-andres" },
      { label: "Providencia", slug: "providencia" },
      { label: "Taganga", slug: "taganga" },
      // Dominican Republic
      { label: "Bayahíbe", slug: "bayahibe" },
      { label: "Las Terrenas", slug: "las-terrenas" },
      // Caribbean — ABC islands
      { label: "Bonaire", slug: "bonaire" },
      { label: "Curaçao", slug: "curacao" },
      { label: "Aruba", slug: "aruba" },
      { label: "Dominica", slug: "dominica" },
      // South America
      { label: "Bonito", slug: "bonito" },
    ],
  },
  {
    label: "Hike",
    destinations: [
      // Mexico & Central America
      { label: "Oaxaca", slug: "oaxaca" },
      { label: "San Cristóbal", slug: "san-cristobal-de-las-casas" },
      { label: "Lago Atitlán", slug: "lago-atitlan" },
      { label: "Acatenango", slug: "acatenango" },
      { label: "Antigua Guatemala", slug: "antigua-guatemala" },
      { label: "Quetzaltenango", slug: "quetzaltenango" },
      { label: "Ometepe", slug: "ometepe" },
      { label: "Copán Ruinas", slug: "copan-ruinas" },
      { label: "Boquete", slug: "boquete" },
      { label: "El Valle de Antón", slug: "el-valle-de-anton" },
      { label: "Monteverde", slug: "monteverde" },
      { label: "Arenal", slug: "arenal" },
      // Colombia
      { label: "Minca", slug: "minca" },
      { label: "Tayrona", slug: "tayrona" },
      { label: "Villa de Leyva", slug: "villa-de-leyva" },
      // Ecuador
      { label: "Baños", slug: "banos" },
      { label: "Quilotoa", slug: "quilotoa" },
      { label: "Mindo", slug: "mindo" },
      // Peru
      { label: "Huaraz", slug: "huaraz" },
      { label: "Cusco", slug: "cusco" },
      { label: "Ollantaytambo", slug: "ollantaytambo" },
      { label: "Chachapoyas", slug: "chachapoyas" },
      // Bolivia
      { label: "Sorata", slug: "sorata" },
      { label: "Rurrenabaque", slug: "rurrenabaque" },
      // Caribbean volcanoes
      { label: "Martinique", slug: "martinique" },
      { label: "Guadeloupe", slug: "guadeloupe" },
      { label: "Dominica", slug: "dominica" },
      // Brazil
      { label: "Lençóis", slug: "lencois" },
      { label: "Alto Paraíso", slug: "alto-paraiso" },
      // Southern Cone
      { label: "Bariloche", slug: "bariloche" },
      { label: "El Chaltén", slug: "el-chalten" },
      { label: "Puerto Natales", slug: "puerto-natales" },
      { label: "Pucón", slug: "pucon" },
      { label: "San Pedro de Atacama", slug: "san-pedro-de-atacama" },
      { label: "Mendoza", slug: "mendoza" },
      { label: "Jujuy", slug: "jujuy" },
    ],
  },
  {
    label: "Yoga & wellness",
    destinations: [
      // Mexico
      { label: "Tepoztlán", slug: "tepoztlan" },
      { label: "Todos Santos", slug: "todos-santos" },
      { label: "Mazunte", slug: "mazunte" },
      { label: "Bacalar", slug: "bacalar" },
      // Guatemala
      { label: "San Marcos La Laguna", slug: "san-marcos-la-laguna" },
      { label: "San Pedro La Laguna", slug: "san-pedro-la-laguna" },
      { label: "Panajachel", slug: "panajachel" },
      // Costa Rica
      { label: "Nosara", slug: "nosara" },
      { label: "Montezuma", slug: "montezuma" },
      { label: "Puerto Viejo", slug: "puerto-viejo" },
      { label: "Uvita", slug: "uvita" },
      { label: "Santa Teresa", slug: "santa-teresa" },
      // Colombia
      { label: "Palomino", slug: "palomino" },
      { label: "Villa de Leyva", slug: "villa-de-leyva" },
      { label: "Minca", slug: "minca" },
      // Ecuador
      { label: "Olón", slug: "olon" },
      { label: "Vilcabamba", slug: "vilcabamba" },
      { label: "Mindo", slug: "mindo" },
      // Peru
      { label: "Pisac", slug: "pisac" },
      { label: "Ollantaytambo", slug: "ollantaytambo" },
      // Bolivia
      { label: "Coroico", slug: "coroico" },
      // Brazil
      { label: "Trancoso", slug: "trancoso" },
      { label: "Paraty", slug: "paraty" },
      { label: "Alto Paraíso", slug: "alto-paraiso" },
      // Chile / Argentina
      { label: "Pucón", slug: "pucon" },
    ],
  },
  {
    label: "Kite & wind",
    destinations: [
      // Caribbean
      { label: "Cabarete", slug: "cabarete" },
      // Brazil — world-class kite corridor
      { label: "Cumbuco", slug: "cumbuco" },
      { label: "Preá", slug: "prea" },
      { label: "Jericoacoara", slug: "jericoacoara" },
      { label: "Atins", slug: "atins" },
      { label: "Canoa Quebrada", slug: "canoa-quebrada" },
      { label: "São Miguel do Gostoso", slug: "sao-miguel-do-gostoso" },
      // Caribbean ABC islands — world-class flat water & trade winds
      { label: "Aruba", slug: "aruba" },
      { label: "Bonaire", slug: "bonaire" },
      { label: "Curaçao", slug: "curacao" },
      // Colombia
      { label: "Cabo de la Vela", slug: "cabo-de-la-vela" },
      // Mexico — Baja
      { label: "La Ventana", slug: "la-ventana" },
      { label: "Los Barriles", slug: "los-barriles" },
      // Peru / Chile
      { label: "Paracas", slug: "paracas" },
      { label: "Iquique", slug: "iquique" },
      // Uruguay
      { label: "La Paloma", slug: "la-paloma" },
    ],
  },
  {
    label: "Remote work hubs",
    destinations: [
      // Mexico
      { label: "Mexico City", slug: "mexico-city" },
      { label: "Guadalajara", slug: "guadalajara" },
      { label: "Puerto Vallarta", slug: "puerto-vallarta" },
      { label: "Playa del Carmen", slug: "playa-del-carmen" },
      { label: "Oaxaca", slug: "oaxaca" },
      { label: "San Cristóbal", slug: "san-cristobal-de-las-casas" },
      { label: "Mérida", slug: "merida" },
      // Central America & Caribbean
      { label: "Panama City", slug: "panama-city" },
      { label: "San José CR", slug: "san-jose-costa-rica" },
      { label: "Antigua", slug: "antigua-guatemala" },
      { label: "Granada", slug: "granada" },
      { label: "San Juan PR", slug: "san-juan-puerto-rico" },
      { label: "Las Terrenas", slug: "las-terrenas" },
      // Colombia
      { label: "Medellín", slug: "medellin" },
      { label: "Bogotá", slug: "bogota" },
      { label: "Cartagena", slug: "cartagena" },
      { label: "Santa Marta", slug: "santa-marta" },
      { label: "Cali", slug: "cali" },
      { label: "Salento", slug: "salento" },
      // Ecuador
      { label: "Quito", slug: "quito" },
      { label: "Cuenca", slug: "cuenca" },
      // Peru
      { label: "Lima", slug: "lima" },
      { label: "Arequipa", slug: "arequipa" },
      { label: "Cusco", slug: "cusco" },
      // Bolivia
      { label: "Sucre", slug: "sucre" },
      { label: "La Paz", slug: "la-paz-bolivia" },
      // Brazil
      { label: "São Paulo", slug: "sao-paulo" },
      { label: "Rio de Janeiro", slug: "rio-de-janeiro" },
      { label: "Florianópolis", slug: "florianopolis" },
      { label: "Curitiba", slug: "curitiba" },
      { label: "Porto Alegre", slug: "porto-alegre" },
      { label: "Recife", slug: "recife" },
      { label: "Salvador", slug: "salvador" },
      { label: "Fortaleza", slug: "fortaleza" },
      // Southern Cone
      { label: "Buenos Aires", slug: "buenos-aires" },
      { label: "Montevideo", slug: "montevideo" },
      { label: "Córdoba", slug: "cordoba" },
      { label: "Rosario", slug: "rosario" },
      { label: "Mendoza", slug: "mendoza" },
      { label: "Santiago", slug: "santiago" },
      { label: "Valparaíso", slug: "valparaiso" },
      { label: "Asunción", slug: "asuncion" },
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

        {/* ── Explore the map ── white ─────────────────────────── */}
        <section className="border-b border-dune bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Explore the map
            </p>
            <p className="mt-2 text-sm text-umber max-w-md">
              160+ destinations across Latin America and the Caribbean. Filter by activity or click any pin to explore.
            </p>
            <div className="mt-8">
              <DestinationsMap />
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
              Jump straight in — or search any spot above.
            </p>

            <div className="mt-10 space-y-10">
              {DESTINATION_CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat.label];
                return (
                  <div key={cat.label}>
                    {/* Category header */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="text-lg leading-none">{meta?.icon}</span>
                      <div>
                        <span className="text-sm font-semibold text-bark">{cat.label}</span>
                        {meta?.description && (
                          <span className="ml-2 text-xs text-umber/50">{meta.description}</span>
                        )}
                      </div>
                    </div>

                    {/* Mobile: horizontal scroll · Desktop: wrap */}
                    <div className="relative">
                      <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {cat.destinations.map(({ label, slug }) => (
                          <DestinationPill
                            key={slug}
                            slug={slug}
                            label={label}
                            category={cat.label}
                          />
                        ))}
                      </div>
                      {/* Fade hint on mobile only */}
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-sand to-transparent sm:hidden" />
                    </div>
                  </div>
                );
              })}
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

