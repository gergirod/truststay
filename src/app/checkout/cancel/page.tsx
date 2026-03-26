import Link from "next/link";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";

type Props = {
  searchParams: Promise<{ slug?: string }>;
};

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const { slug } = await searchParams;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <span className="text-base font-semibold tracking-tight text-stone-900">
            Trustay
          </span>
        </div>
      </header>

      <AnalyticsEvent
        event="checkout_cancelled"
        properties={{ city_slug: slug ?? null }}
      />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
            Payment cancelled
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            No charge was made.
          </h1>
          <p className="mt-3 text-base text-stone-500">
            You can still browse the free city setup, or unlock whenever you&rsquo;re ready.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {slug ? (
              <Link
                href={`/city/${slug}`}
                className="inline-block rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Back to city setup
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-block rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
              >
                Back to homepage
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
