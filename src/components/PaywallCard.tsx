"use client";

import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";
import { CHECKOUT_PENDING_KEY } from "@/components/CheckoutSuccessTracker";

interface LockedCounts {
  workSpots: number;
  coworkings: number;
  gyms: number;
  foodSpots: number;
}

interface Props {
  citySlug: string;
  cityName: string;
  country: string;
  lockedCounts: LockedCounts;
}

export function PaywallCard({ citySlug, cityName, country, lockedCounts }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const displayPrice = process.env.NEXT_PUBLIC_CITY_PASS_PRICE;
  const totalLocked =
    lockedCounts.workSpots +
    lockedCounts.coworkings +
    lockedCounts.gyms +
    lockedCounts.foodSpots;

  useEffect(() => {
    track("paywall_viewed", {
      city_slug: citySlug,
      city_name: cityName,
      country,
      is_unlocked: false,
      locked_work_spots: lockedCounts.workSpots,
      locked_coworkings: lockedCounts.coworkings,
      locked_gyms: lockedCounts.gyms,
      locked_food_spots: lockedCounts.foodSpots,
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
          <ul className="mt-4 space-y-1.5">
            {lockedCounts.workSpots > 0 && (
              <LockedItem label={`+${lockedCounts.workSpots} more work spots`} />
            )}
            {lockedCounts.coworkings > 0 && (
              <LockedItem
                label={`+${lockedCounts.coworkings} more coworking space${lockedCounts.coworkings !== 1 ? "s" : ""}`}
              />
            )}
            {lockedCounts.gyms > 0 && (
              <LockedItem
                label={`+${lockedCounts.gyms} more gym${lockedCounts.gyms !== 1 ? "s" : ""}`}
              />
            )}
            {lockedCounts.foodSpots > 0 && (
              <LockedItem
                label={`+${lockedCounts.foodSpots} more food spot${lockedCounts.foodSpots !== 1 ? "s" : ""}`}
              />
            )}
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleUnlock}
            disabled={status === "loading"}
            className="w-full rounded-xl bg-bark px-5 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === "loading"
              ? "Opening checkout…"
              : displayPrice
              ? `Unlock — $${displayPrice}`
              : "Unlock City Pass"}
          </button>
          <p className="text-sm text-umber">
            One-time &middot; No account needed
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
