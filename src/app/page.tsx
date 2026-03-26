import { CitySearch } from "@/components/CitySearch";

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
    title: "Decision support, not discovery clutter",
    body: "We answer one question: where should you base yourself to get functional fast.",
  },
  {
    title: "Honest signals, not fake certainty",
    body: "Wi-Fi and noise ratings are labeled as verified, likely, or unknown — never as guaranteed.",
  },
  {
    title: "Built for routine, not tourism",
    body: "Work spots, gyms, and food options that support a repeatable daily rhythm.",
  },
];

const FREE_FEATURES = [
  "City overview and routine score",
  "Suggested base area",
  "Top picks per category",
];

const PASS_FEATURES = [
  "Full place lists, every category",
  "Deeper confidence breakdown",
  "All supporting venue data",
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ── bg-stone-50 per design system ────────── */}
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-stone-900">
            Trustay
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── stone-50 bg, inner white card ─────────── */}
        <section className="border-b border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-4xl px-6 py-8 sm:py-14">
            <div className="rounded-3xl border border-stone-200 bg-white px-6 py-10 shadow-sm sm:px-12 sm:py-14">
              <div className="max-w-2xl">
                {/* Eyebrow — single teal accent dot */}
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-medium text-stone-600">
                    For remote workers
                  </span>
                </div>

                <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
                  Choose your next remote-work base with confidence.
                </h1>

                <p className="mt-5 max-w-lg text-base leading-7 text-stone-600">
                  See where to stay, work, train, and eat — without losing
                  days to research.
                </p>

                <div className="mt-8">
                  <CitySearch />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── white ──────────────────────────── */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              How it works
            </p>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {HOW_IT_WORKS.map(({ n, title, body }) => (
                <div
                  key={n}
                  className="border-l-2 border-stone-200 pl-5 sm:border-0 sm:pl-0"
                >
                  <span className="block text-5xl font-bold leading-none tracking-tight text-stone-200 tabular-nums">
                    {n}
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Trustay ── stone-50 ────────────────────────── */}
        <section className="border-b border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Why Trustay
            </p>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {WHY_TRUSTAY.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-stone-200 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── white ───────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Pricing
            </p>
            <div className="mt-12 grid max-w-xl gap-4 sm:grid-cols-2">
              {/* Free tier */}
              <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Free
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
                  $0
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-6 text-stone-600"
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-stone-300" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* City Pass — premium dark card */}
              <div className="flex flex-col rounded-2xl bg-stone-900 p-6 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                    City Pass
                  </p>
                  <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-300">
                    Recommended
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  One-time
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {PASS_FEATURES.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm leading-6 text-stone-300"
                    >
                      <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-stone-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-6 text-sm text-stone-500">
              No account required. One purchase per city.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── white ────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-stone-500">
            Trustay — built for remote workers who need to get functional fast.
          </p>
        </div>
      </footer>
    </div>
  );
}
