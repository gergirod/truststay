"use client";

import { useState } from "react";
import type { Place, PlaceConfidence } from "@/types";
import {
  formatCategory,
  formatWorkFit,
  formatWifi,
  formatNoiseRisk,
  formatRoutineFit,
  formatConvenience,
  formatQuickMealFit,
  formatRoutineSupport,
  formatPriceLevel,
  formatBestForTag,
  formatDistance,
} from "@/lib/format";
import { PlaceModal } from "./PlaceModal";

interface Props {
  place: Place;
}

type BadgeTier = "verified" | "neutral" | "uncertain";

function getWorkFitTier(v: NonNullable<PlaceConfidence["workFit"]>): BadgeTier {
  if (v === "high") return "verified";
  if (v === "low") return "uncertain";
  return "neutral";
}

function getWifiTier(v: NonNullable<PlaceConfidence["wifiConfidence"]>): BadgeTier {
  if (v === "verified") return "verified";
  if (v === "unknown" || v === "weak") return "uncertain";
  return "neutral";
}

function getNoiseTier(v: NonNullable<PlaceConfidence["noiseRisk"]>): BadgeTier {
  if (v === "unknown") return "uncertain";
  return "neutral";
}

function getRoutineFitTier(v: NonNullable<PlaceConfidence["routineFit"]>): BadgeTier {
  if (v === "high") return "verified";
  if (v === "low") return "uncertain";
  return "neutral";
}

function getConvenienceTier(v: NonNullable<PlaceConfidence["convenience"]>): BadgeTier {
  if (v === "high") return "verified";
  if (v === "low") return "uncertain";
  return "neutral";
}

function getQuickMealFitTier(v: NonNullable<PlaceConfidence["quickMealFit"]>): BadgeTier {
  if (v === "high") return "verified";
  if (v === "low") return "uncertain";
  return "neutral";
}

function getRoutineSupportTier(v: NonNullable<PlaceConfidence["routineSupport"]>): BadgeTier {
  if (v === "high") return "verified";
  if (v === "low") return "uncertain";
  return "neutral";
}

export function PlaceCard({ place }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { confidence } = place;

  const hasConfidenceSignals =
    confidence.workFit !== undefined ||
    confidence.wifiConfidence !== undefined ||
    confidence.noiseRisk !== undefined ||
    confidence.routineFit !== undefined ||
    confidence.convenience !== undefined ||
    confidence.quickMealFit !== undefined ||
    confidence.routineSupport !== undefined;

  // Prefer distanceFromBasekm (work-cluster centroid) over city-centre distance
  const displayDistance =
    place.distanceFromBasekm !== undefined
      ? { value: place.distanceFromBasekm, label: "from base area" }
      : place.distanceKm !== undefined
      ? { value: place.distanceKm, label: "away" }
      : null;

  // Show a star rating if Google enrichment provided one
  const hasRating =
    (place.google?.rating ?? place.rating) !== undefined;

  return (
    <>
      <div className="rounded-2xl border border-dune bg-white p-5 shadow-sm">
        {/* Name + meta */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-bark">{place.name}</p>
            <p className="mt-1 text-xs text-umber">
              {formatCategory(place.category)}
              {place.google?.priceLevel && (
                <>
                  {" "}
                  &middot;{" "}
                  <span className="font-medium">
                    {formatPriceLevel(place.google.priceLevel)}
                  </span>
                </>
              )}
              {displayDistance && (
                <>
                  {" "}
                  &middot; {formatDistance(displayDistance.value)}{" "}
                  {displayDistance.label}
                </>
              )}
              {hasRating && (
                <>
                  {" "}
                  &middot; ★{" "}
                  {(place.google?.rating ?? place.rating)!.toFixed(1)}
                  {(place.google?.reviewCount ?? place.reviewCount) !==
                    undefined && (
                    <span className="text-stone-400">
                      {" "}
                      (
                      {(
                        place.google?.reviewCount ?? place.reviewCount
                      )!.toLocaleString()}
                      )
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Details trigger — always present, works in both enriched + OSM-only modes */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 mt-0.5 text-xs font-medium text-umber underline underline-offset-2 hover:text-bark transition-colors"
          >
            Details
          </button>
        </div>

        {/* Confidence signals */}
        {hasConfidenceSignals && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {confidence.workFit !== undefined && (
              <Badge
                label="Work fit"
                value={formatWorkFit(confidence.workFit)}
                tier={getWorkFitTier(confidence.workFit)}
              />
            )}
            {confidence.wifiConfidence !== undefined && (
              <Badge
                label="Wi-Fi"
                value={formatWifi(confidence.wifiConfidence)}
                tier={getWifiTier(confidence.wifiConfidence)}
              />
            )}
            {confidence.noiseRisk !== undefined && (
              <Badge
                label="Noise"
                value={formatNoiseRisk(confidence.noiseRisk)}
                tier={getNoiseTier(confidence.noiseRisk)}
              />
            )}
            {confidence.routineFit !== undefined && (
              <Badge
                label="Routine fit"
                value={formatRoutineFit(confidence.routineFit)}
                tier={getRoutineFitTier(confidence.routineFit)}
              />
            )}
            {confidence.convenience !== undefined && (
              <Badge
                label="Convenience"
                value={formatConvenience(confidence.convenience)}
                tier={getConvenienceTier(confidence.convenience)}
              />
            )}
            {confidence.quickMealFit !== undefined && (
              <Badge
                label="Quick meal"
                value={formatQuickMealFit(confidence.quickMealFit)}
                tier={getQuickMealFitTier(confidence.quickMealFit)}
              />
            )}
            {confidence.routineSupport !== undefined && (
              <Badge
                label="Routine fit"
                value={formatRoutineSupport(confidence.routineSupport)}
                tier={getRoutineSupportTier(confidence.routineSupport)}
              />
            )}
          </div>
        )}

        {/* Best-for tags — visually secondary to confidence signals */}
        {place.bestFor.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {place.bestFor.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sand px-2.5 py-0.5 text-xs text-umber"
              >
                {formatBestForTag(tag)}
              </span>
            ))}
          </div>
        )}

        {/* Explanation */}
        <div className="mt-4 border-t border-dune pt-3">
          <p className="text-sm leading-6 text-umber">{place.explanation}</p>
        </div>
      </div>

      {/* Modal — works in both enriched and OSM-only fallback modes */}
      {modalOpen && (
        <PlaceModal place={place} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function Badge({
  label,
  value,
  tier = "neutral",
}: {
  label: string;
  value: string;
  tier?: BadgeTier;
}) {
  if (tier === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sage bg-mist px-2 py-0.5 text-xs">
        <span className="font-medium text-umber">{label}:</span>
        <span className="font-medium text-bark">{value}</span>
      </span>
    );
  }

  if (tier === "uncertain") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-dune bg-white px-2 py-0.5 text-xs">
        <span className="text-stone-400">{label}:</span>
        <span className="italic text-umber">{value}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-dune bg-cream px-2 py-0.5 text-xs">
      <span className="font-medium text-umber">{label}:</span>
      <span className="text-bark">{value}</span>
    </span>
  );
}
