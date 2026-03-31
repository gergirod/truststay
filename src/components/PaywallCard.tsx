"use client";

import React, { useState, useEffect } from "react";
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
  /**
   * Whether the user has already shaped their stay (intent present in URL).
   * When false, locked copy should not reference "your base" — no base has
   * been computed yet and the personalized recommendation doesn't exist.
   */
  hasIntent?: boolean;
  intent?: {
    purpose: string;
    workStyle: string;
    dailyBalance?: string;
  } | null;
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
  hasIntent = false,
  intent = null,
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
          ...(intent?.purpose ? { purpose: intent.purpose } : {}),
          ...(intent?.workStyle ? { workStyle: intent.workStyle } : {}),
          ...(intent?.dailyBalance ? { dailyBalance: intent.dailyBalance } : {}),
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
        body: JSON.stringify({
          product: "city_pass",
          citySlug,
          ...(intent?.purpose ? { purpose: intent.purpose } : {}),
          ...(intent?.workStyle ? { workStyle: intent.workStyle } : {}),
          ...(intent?.dailyBalance ? { dailyBalance: intent.dailyBalance } : {}),
        }),
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
          Your stay setup — {cityName}
        </p>
        <h2 className="mt-3 text-lg font-semibold text-bark">
          Everything you need before you arrive
        </h2>
        <p className="mt-2 text-sm leading-6 text-umber">
          You can see how the base area looks and which places exist nearby.
          Unlock to get the full picture — what fits, what to plan around, and
          every option sorted by distance from your base.
        </p>

        {hookLine && (
          <p className="mt-3 text-sm font-medium text-bark">{hookLine}</p>
        )}

        {totalLocked > 0 && (
          <div className="mt-4">
            <ul className="space-y-1.5">
              <LockedItem
                label={
                  hasIntent
                    ? "Why your base fits and what to plan around"
                    : "Your best base recommendation — why it fits and what to plan around"
                }
              />
              <LockedItem label="Every work spot and café sorted by distance" />
              <LockedItem label="Daily essentials — grocery and pharmacy — near your base" />
              <LockedItem label="Hours, ratings, and Maps links for each place" />
              <LockedItem label="Honest signals: wifi quality, noise level, work fit" />
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
              ? `Get your full setup — $${displayPrice}`
              : `Get your full setup`}
          </button>
          <p className="text-sm text-umber">
            One-time &middot; No account needed &middot; Instant access
          </p>
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
        )}

        {/* Full city option: get setup for every area in the parent city */}
        {parentCity && parentCitySlug && bundlePrice && (
          <div className="mt-5 pt-5 border-t border-dune">
            <p className="text-sm text-umber mb-3">
              Considering multiple areas in {parentCity}?
            </p>
            <button
              onClick={handleBundleUnlock}
              disabled={bundleStatus === "loading"}
              className="w-full rounded-xl border border-bark bg-transparent px-5 py-3 text-sm font-semibold text-bark transition-colors hover:bg-bark/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {bundleStatus === "loading"
                ? "Opening checkout…"
                : `Get the full ${parentCity} setup — $${bundlePrice}`}
            </button>
            <p className="mt-2 text-xs text-umber">
              One payment · Every area in {parentCity} fully prepared
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

function LockedItem({ label }: { label: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-umber">
      <span className="h-1 w-1 flex-shrink-0 rounded-full bg-dune" />
      {label}
    </li>
  );
}
