"use client";

import { useState } from "react";

interface LockedCounts {
  workSpots: number;
  coworkings: number;
  gyms: number;
  foodSpots: number;
}

interface Props {
  citySlug: string;
  cityName: string;
  lockedCounts: LockedCounts;
}

export function PaywallCard({ citySlug, cityName, lockedCounts }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const displayPrice = process.env.NEXT_PUBLIC_CITY_PASS_PRICE;
  const totalLocked =
    lockedCounts.workSpots +
    lockedCounts.coworkings +
    lockedCounts.gyms +
    lockedCounts.foodSpots;

  async function handleUnlock() {
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
    <div className="rounded-2xl border border-stone-200 bg-white">
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          City Pass — {cityName}
        </p>
        <h2 className="mt-3 text-lg font-semibold text-stone-900">
          Unlock the full setup
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
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
            className="w-full rounded-xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {status === "loading"
              ? "Opening checkout…"
              : displayPrice
              ? `Unlock — $${displayPrice}`
              : "Unlock City Pass"}
          </button>
          <p className="text-sm text-stone-500">
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
    <li className="flex items-center gap-2.5 text-sm text-stone-500">
      <span className="h-1 w-1 flex-shrink-0 rounded-full bg-stone-300" />
      {label}
    </li>
  );
}
