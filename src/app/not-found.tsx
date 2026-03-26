import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-stone-900"
          >
            Trustay
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            404
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            Page not found
          </h1>
          <p className="mt-3 text-base leading-relaxed text-stone-500">
            This page doesn&rsquo;t exist. Head back to the homepage and search for a
            city.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
