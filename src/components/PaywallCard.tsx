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
  /** Parent city name shown on the bundle CTA, e.g. "Buenos Aires" */
  parentCity?: string;
  /** Parent city slug used for the bundle checkout, e.g. "buenos-aires" */
  parentCitySlug?: string;
  /** Display price for the city bundle, e.g. "15" */
  bundlePrice?: string;
}

export function PaywallCard({
  citySlug,
  cityName,
  country,
  lockedCounts,
  hookLine,
  parentCity,
  parentCitySlug,
  bundlePrice,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [bundleStatus, setBundleStatus] = useState<"idle" | "loading" | "error">("idle");
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

  async function handleBundleUnlock() {
    if (!parentCitySlug) return;
    setBundleStatus("loading");

    try {
      sessionStorage.setItem(CHECKOUT_PENDING_KEY, parentCitySlug);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "city_bundle",
          citySlug: parentCitySlug,
          bundleCitySlug: parentCitySlug,
        }),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        track("checkout_started", {
          city_slug: parentCitySlug,
          city_name: parentCity,
          country,
          product: "city_bundle",
        });
        window.location.href = data.checkoutUrl;
      } else {
        setBundleStatus("error");
        setErrorMsg(data.error ?? "Could not start bundle checkout.");
      }
    } catch {
      setBundleStatus("error");
      setErrorMsg("Could not reach the payment service. Please try again.");
    }
  }

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
          Unlock ratings, hours, and details
        </h2>
        <p className="mt-2 text-sm leading-6 text-umber">
          You can see all the places above. Unlock to get ratings, opening
          hours, Wi‑Fi confidence, and Google Maps links for every one.
        </p>

        {hookLine && (
          <p className="mt-3 text-sm font-medium text-bark">{hookLine}</p>
        )}

        {totalLocked > 0 && (
          <div className="mt-4">
            <ul className="space-y-1.5">
              <LockedItem label="Ratings and review counts from Google" />
              <LockedItem label="Opening hours and open/closed status" />
              <LockedItem label="Wi‑Fi confidence and noise signals" />
              <LockedItem label="Direct Google Maps links" />
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

        {/* Bundle option: unlock all neighborhoods in the parent city */}
        {parentCity && parentCitySlug && bundlePrice && (
          <div className="mt-5 pt-5 border-t border-dune">
            <p className="text-sm text-umber mb-3">
              Exploring multiple neighborhoods in {parentCity}?
            </p>
            <button
              onClick={handleBundleUnlock}
              disabled={bundleStatus === "loading"}
              className="w-full rounded-xl border border-bark bg-transparent px-5 py-3 text-sm font-semibold text-bark transition-colors hover:bg-bark/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {bundleStatus === "loading"
                ? "Opening checkout…"
                : `Unlock all ${parentCity} neighborhoods — $${bundlePrice}`}
            </button>
            <p className="mt-2 text-xs text-umber">
              One payment · All neighborhoods unlocked
            </p>
            {bundleStatus === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
          </div>
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
