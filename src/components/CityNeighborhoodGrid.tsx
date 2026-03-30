"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CityNeighborhoodConfig, NeighborhoodEntry } from "@/data/neighborhoods";

interface Props {
  config: CityNeighborhoodConfig;
  /** If undefined, the bundle CTA is hidden (e.g. auto-discovered, non-curated cities) */
  bundlePrice?: string;
  /**
   * When true, the grid is rendered as a confirmation/exploration layer below BestBaseCard.
   * Changes heading, subtitle, and hides the bundle CTA (BestBaseCard handles conversion).
   */
  explorationMode?: boolean;
  /**
   * Base area name from BestBaseCard (e.g. "La Punta").
   * When provided, any neighborhood whose name contains or is contained by this value
   * gets a "Recommended for your stay" badge.
   */
  recommendedAreaName?: string | null;
}

function directionLabel(dir: NeighborhoodEntry["directionFromCenter"]): string {
  if (dir === "Center") return "Central";
  return dir;
}

function NeighborhoodCard({
  n,
  cityName,
  intentParams,
  isRecommended,
}: {
  n: NeighborhoodEntry;
  cityName: string;
  intentParams: Record<string, string>;
  isRecommended?: boolean;
}) {
  const params = new URLSearchParams({
    lat: String(n.lat),
    lon: String(n.lon),
    name: n.name,
    country: "",
    parentCity: cityName,
    bbox: n.bbox.join(","),
    ...intentParams,
  });

  return (
    <Link
      href={`/city/${n.slug}?${params.toString()}`}
      className={`group block rounded-xl p-5 transition-all ${
        isRecommended
          ? "border-2 border-teal bg-mist hover:border-teal hover:shadow-sm"
          : "border border-[#E4DDD2] bg-white hover:border-[#8FB7B3] hover:shadow-sm"
      }`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-white px-2.5 py-1 text-xs font-semibold text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          Recommended for your stay
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`text-base font-semibold transition-colors ${
          isRecommended ? "text-teal" : "text-[#2E2A26] group-hover:text-[#8FB7B3]"
        }`}>
          {n.name}
        </h3>
        <span className="text-xs font-medium text-[#8FB7B3] bg-[#DCEBE9] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          {directionLabel(n.directionFromCenter)}
          {n.directionFromCenter !== "Center" && ` · ${n.distanceFromCenterKm} km`}
        </span>
      </div>
      <p className="text-sm text-[#5F5A54] leading-relaxed mb-3">{n.tagline}</p>
      <span className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
        isRecommended
          ? "text-teal"
          : "text-[#5F5A54] group-hover:text-[#2E2A26]"
      }`}>
        View setup
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            fillRule="evenodd"
            d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </Link>
  );
}

function BundleButton({
  citySlug,
  cityName,
  bundlePrice,
}: {
  citySlug: string;
  cityName: string;
  bundlePrice: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBundle() {
    setLoading(true);
    setError(null);

    try {
      sessionStorage.setItem("ts_checkout_city", citySlug);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "city_bundle",
          citySlug,
          bundleCitySlug: citySlug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Checkout unavailable.");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 border-t border-[#E4DDD2] pt-8 text-center">
      <p className="text-sm text-[#5F5A54] mb-1">
        Planning to stay a while in {cityName}?
      </p>
      <p className="text-base font-semibold text-[#2E2A26] mb-4">
        Unlock all {cityName} neighborhoods — ${bundlePrice}
      </p>
      <p className="text-xs text-[#5F5A54] mb-5">
        One payment. Every neighborhood, fully unlocked.
      </p>
      <button
        onClick={handleBundle}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-[#2E2A26] text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-[#3d3832] transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting…" : `Unlock all ${cityName} — $${bundlePrice}`}
      </button>
      {error && (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      )}
      <p className="mt-3 text-xs text-[#5F5A54]">
        Instant access · Secure checkout
      </p>
    </div>
  );
}

const VALID_PURPOSES = ["surf", "dive", "hike", "yoga", "kite", "work_first", "exploring"];
const VALID_WORK_STYLES = ["light", "balanced", "heavy"];

const PURPOSE_LABELS: Record<string, string> = {
  surf: "surf",
  dive: "diving",
  hike: "hiking",
  yoga: "yoga",
  kite: "kite",
  work_first: "focused work",
  exploring: "exploring",
};
const WORK_LABELS: Record<string, string> = {
  light: "light work",
  balanced: "balanced work",
  heavy: "intensive work",
};

/** Fuzzy match: does the neighborhood name correspond to the recommended area? */
function isMatch(neighborhoodName: string, recommendedArea: string): boolean {
  const a = neighborhoodName.toLowerCase().trim();
  const b = recommendedArea.toLowerCase().trim();
  return a === b || a.includes(b) || b.includes(a);
}

export default function CityNeighborhoodGrid({
  config,
  bundlePrice,
  explorationMode = false,
  recommendedAreaName,
}: Props) {
  const searchParams = useSearchParams();
  const purpose = searchParams.get("purpose") ?? "";
  const workStyle = searchParams.get("workStyle") ?? "";

  const hasIntent =
    VALID_PURPOSES.includes(purpose) && VALID_WORK_STYLES.includes(workStyle);

  // Only forward validated intent params — never pass garbage through
  const intentParams: Record<string, string> = hasIntent
    ? { purpose, workStyle }
    : {};

  const intentLabel = hasIntent
    ? `${PURPOSE_LABELS[purpose] ?? purpose} + ${WORK_LABELS[workStyle] ?? workStyle}`
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-[#8FB7B3] uppercase mb-2">
          {explorationMode ? "Explore other areas" : "Choose your base"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2E2A26] mb-2">
          {explorationMode
            ? `Other areas in ${config.cityName}`
            : `Where to base yourself in ${config.cityName}`}
        </h1>
        <p className="text-sm text-[#5F5A54] max-w-xl">
          {explorationMode
            ? intentLabel
              ? `Viewing for ${intentLabel}. Click any neighborhood to see a full comparison.`
              : `Browse other neighborhoods and compare setups.`
            : intentLabel
            ? `Viewing for ${intentLabel}. Pick a neighborhood — your stay fit analysis will be ready when you arrive.`
            : "Pick a neighborhood to see work spots, coffee and meal options, and training places — organized around a suggested base area."}
        </p>
      </div>

      {/* Neighborhood cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.neighborhoods.map((n) => (
          <NeighborhoodCard
            key={n.slug}
            n={n}
            cityName={config.cityName}
            intentParams={intentParams}
            isRecommended={
              !!recommendedAreaName && isMatch(n.name, recommendedAreaName)
            }
          />
        ))}
      </div>

      {/* Bundle CTA — only shown for curated cities (bundlePrice is passed only then).
          Hidden in explorationMode because BestBaseCard is the single conversion point. */}
      {bundlePrice && !explorationMode && (
        <BundleButton
          citySlug={config.citySlug}
          cityName={config.cityName}
          bundlePrice={bundlePrice}
        />
      )}
    </div>
  );
}
