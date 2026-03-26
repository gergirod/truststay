"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
            Error
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            An unexpected error occurred. Try refreshing the page or go back to
            the homepage.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-stone-300">
              {error.digest}
            </p>
          )}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="w-full rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 sm:w-auto"
            >
              Try again
            </button>
            <Link
              href="/"
              className="w-full rounded-lg border border-stone-200 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 sm:w-auto"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
