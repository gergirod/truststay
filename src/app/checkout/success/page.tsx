import Link from "next/link";
import { verifyAndUnlock } from "./actions";
import { RedirectToCity } from "./RedirectToCity";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return <ErrorPage message="No session ID found. If you completed a purchase, please contact support." />;
  }

  const result = await verifyAndUnlock(session_id);

  if (!result.ok) {
    return <ErrorPage message={result.error} />;
  }

  return <RedirectToCity citySlug={result.citySlug} />;
}

function ErrorPage({ message }: { message: string }) {
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
            Something went wrong
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900">
            We couldn&rsquo;t confirm your payment
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{message}</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="inline-block rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700"
            >
              Back to homepage
            </Link>
            <p className="text-xs text-stone-400">
              If you were charged, email us and we&rsquo;ll sort it out.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
