"use client";

import { useState } from "react";
import Link from "next/link";
import type { CityNeighborhoodConfig, NeighborhoodEntry } from "@/data/neighborhoods";

interface Props {
  config: CityNeighborhoodConfig;
  /** If undefined, the bundle CTA is hidden (e.g. auto-discovered, non-curated cities) */
  bundlePrice?: string;
}

function directionLabel(dir: NeighborhoodEntry["directionFromCenter"]): string {
  if (dir === "Center") return "Central";
  return dir;
}

function NeighborhoodCard({ n, cityName }: { n: NeighborhoodEntry; cityName: string }) {
  const params = new URLSearchParams({
    lat: String(n.lat),
    lon: String(n.lon),
    name: n.name,
    country: "",
    parentCity: cityName,
    bbox: n.bbox.join(","),
  });

  return (
    <Link
      href={`/city/${n.slug}?${params.toString()}`}
      className="group block bg-white border border-[#E4DDD2] rounded-xl p-5 hover:border-[#8FB7B3] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-[#2E2A26] group-hover:text-[#8FB7B3] transition-colors">
          {n.name}
        </h3>
        <span className="text-xs font-medium text-[#8FB7B3] bg-[#DCEBE9] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
          {directionLabel(n.directionFromCenter)}
          {n.directionFromCenter !== "Center" && ` · ${n.distanceFromCenterKm} km`}
        </span>
      </div>
      <p className="text-sm text-[#5F5A54] leading-relaxed mb-3">{n.tagline}</p>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5F5A54] group-hover:text-[#2E2A26] transition-colors">
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

export default function CityNeighborhoodGrid({ config, bundlePrice }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-[#8FB7B3] uppercase mb-2">
          Choose your base
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2E2A26] mb-2">
          Where to base yourself in {config.cityName}
        </h1>
        <p className="text-sm text-[#5F5A54] max-w-xl">
          Pick a neighborhood to see work spots, coffee and meal options, and
          training places — organized around a suggested base area.
        </p>
      </div>

      {/* Neighborhood cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.neighborhoods.map((n) => (
          <NeighborhoodCard key={n.slug} n={n} cityName={config.cityName} />
        ))}
      </div>

      {/* Bundle CTA — only shown for curated cities (bundlePrice is passed only then) */}
      {bundlePrice && (
        <BundleButton
          citySlug={config.citySlug}
          cityName={config.cityName}
          bundlePrice={bundlePrice}
        />
      )}
    </div>
  );
}
