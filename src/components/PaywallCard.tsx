"use client";

import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
import { CHECKOUT_PENDING_KEY } from "@/components/CheckoutSuccessTracker";

interface LockedCounts {
  work: number;
  coffeeMeals: number;
  training: number;
}

interface Props {
  citySlug: string;
  cityName: string;
  country: string;
  lockedCounts: LockedCounts;
  hookLine?: string;
}

export function PaywallCard({ citySlug, cityName, country, lockedCounts, hookLine }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const displayPrice = process.env.NEXT_PUBLIC_CITY_PASS_PRICE;
  const totalLocked =
    lockedCounts.work +
    lockedCounts.coffeeMeals +
    lockedCounts.training;

  useEffect(() => {
    track("paywall_viewed", {
      city_slug: citySlug,
      city_name: cityName,
      country,
      is_unlocked: false,
      locked_work: lockedCounts.work,
      locked_coffee_meals: lockedCounts.coffeeMeals,
      locked_training: lockedCounts.training,
      total_locked: totalLocked,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock() {
    track("unlock_clicked", {
      city_slug: citySlug,
      city_name: cityName,
      country,
    });

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "city_pass", citySlug }),
      });
      const data = await res.json();

      if (data.ok && data.checkoutUrl) {
        track("checkout_started", {
          city_slug: citySlug,
          city_name: cityName,
          country,
        });
        // Write handoff key so CheckoutSuccessTracker can detect the return
        sessionStorage.setItem(CHECKOUT_PENDING_KEY, citySlug);
        window.location.href = data.checkoutUrl;
      } else {
        setStatus("error");
        setErrorMsg(
          data.error ?? "Could not start checkout. Please try again."
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the payment service. Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-dune bg-white">
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
          City Pass — {cityName}
        </p>
        <h2 className="mt-3 text-lg font-semibold text-bark">
          Unlock the full setup
        </h2>
        <p className="mt-2 text-sm leading-6 text-umber">
          You&rsquo;re seeing the free preview. The full city pass unlocks
          everything.
        </p>

        {totalLocked > 0 && (
          <div className="mt-4">
            {hookLine && (
              <p className="mb-3 text-sm font-medium text-bark">{hookLine}</p>
            )}
            <ul className="space-y-1.5">
              {lockedCounts.work > 0 && (
                <LockedItem
                  label={`+${lockedCounts.work} more work spot${lockedCounts.work !== 1 ? "s" : ""}`}
                />
              )}
              {lockedCounts.coffeeMeals > 0 && (
                <LockedItem
                  label={`+${lockedCounts.coffeeMeals} more coffee & meal spot${lockedCounts.coffeeMeals !== 1 ? "s" : ""}`}
                />
              )}
              {lockedCounts.training > 0 && (
                <LockedItem
                  label={`+${lockedCounts.training} more training spot${lockedCounts.training !== 1 ? "s" : ""}`}
                />
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleUnlock}
            disabled={status === "loading"}
            className="w-full rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-teal disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === "loading"
              ? "Opening checkout…"
              : displayPrice
              ? `Unlock ${cityName} setup — $${displayPrice}`
              : `Unlock ${cityName} setup`}
          </button>
          <p className="text-sm text-umber">
            One-time &middot; No account needed &middot; Instant access
          </p>
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
        )}
      </div>
    </div>
  );
}

function LockedItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-umber">
      <span className="h-1 w-1 flex-shrink-0 rounded-full bg-dune" />
      {label}
    </li>
  );
}
