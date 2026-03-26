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

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-stone-900">
            Trustay
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + Search */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              Choose your next remote-work base with confidence.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-stone-500">
              See where to stay, work, train, and eat without losing days to
              research.
            </p>
            <div className="mt-10">
              <CitySearch />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              How it works
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-3">
              {HOW_IT_WORKS.map(({ n, title, body }) => (
                <div key={n}>
                  <span className="text-3xl font-bold text-stone-100">{n}</span>
                  <h3 className="mt-3 text-base font-semibold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Trustay */}
        <section className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Why Trustay
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {WHY_TRUSTAY.map(({ title, body }) => (
              <div key={title}>
                <h3 className="text-base font-semibold text-stone-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Pricing
            </h2>
            <div className="mt-10 grid max-w-lg gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  Free
                </p>
                <p className="mt-3 text-2xl font-semibold text-stone-900">
                  $0
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-600">
                  <li>City overview</li>
                  <li>Recommended area</li>
                  <li>Top picks per category</li>
                </ul>
              </div>
              <div className="rounded-xl border border-stone-900 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  City Pass
                </p>
                <p className="mt-3 text-2xl font-semibold text-stone-900">
                  One-time
                </p>
                <ul className="mt-4 space-y-2 text-sm text-stone-600">
                  <li>Full place lists</li>
                  <li>Deeper confidence breakdown</li>
                  <li>All supporting categories</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-xs text-stone-400">
              No account required. One purchase per city.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-xs text-stone-400">
            Trustay — built for remote workers who need to get functional fast.
          </p>
        </div>
      </footer>
    </div>
  );
}
