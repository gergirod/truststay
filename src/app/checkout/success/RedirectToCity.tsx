"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  citySlug: string;
}

export function RedirectToCity({ citySlug }: Props) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push(`/city/${citySlug}`), 2500);
    return () => clearTimeout(t);
  }, [citySlug, router]);

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-stone-900">
            Trustay
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Payment confirmed
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            You&rsquo;re unlocked.
          </h1>
          <p className="mt-3 text-base text-stone-500">
            Taking you to the full city setup now&hellip;
          </p>
          <div className="mt-8">
            <Link
              href={`/city/${citySlug}`}
              className="inline-block rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Go to city setup
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
