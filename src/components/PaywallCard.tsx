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
    <div className="rounded-xl border border-stone-300 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        City Pass — {cityName}
      </p>
      <h2 className="mt-3 text-lg font-semibold text-stone-900">
        Unlock the full setup
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        You&rsquo;re seeing the free preview. The full city pass unlocks everything.
      </p>

      {/* Locked summary */}
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

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleUnlock}
          disabled={status === "loading"}
          className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading"
            ? "Opening checkout…"
            : displayPrice
            ? `Unlock — $${displayPrice}`
            : "Unlock City Pass"}
        </button>
        <p className="text-xs text-stone-400">One-time · No account needed</p>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}

function LockedItem({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-stone-500">
      <span className="text-stone-300">⊘</span>
      {label}
    </li>
  );
}
