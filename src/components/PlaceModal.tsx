"use client";

import { useEffect } from "react";
import type { Place, PlaceConfidence } from "@/types";
import {
  formatCategory,
  formatDistance,
  formatWorkFit,
  formatWifi,
  formatNoiseRisk,
  formatRoutineFit,
  formatConvenience,
  formatQuickMealFit,
  formatRoutineSupport,
  formatPriceLevel,
} from "@/lib/format";

interface Props {
  place: Place;
  onClose: () => void;
}

// ── Confidence badge tier ──────────────────────────────────────────────────

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
  if (v === "low") return "verified";
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

function ModalBadge({
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

// ── Modal ──────────────────────────────────────────────────────────────────

export function PlaceModal({ place, onClose }: Props) {
  const { confidence, google } = place;

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hasConfidenceSignals =
    confidence.workFit !== undefined ||
    confidence.wifiConfidence !== undefined ||
    confidence.noiseRisk !== undefined ||
    confidence.routineFit !== undefined ||
    confidence.convenience !== undefined ||
    confidence.quickMealFit !== undefined ||
    confidence.routineSupport !== undefined;

  const displayRating = google?.rating ?? place.rating;
  const displayReviewCount = google?.reviewCount ?? place.reviewCount;

  return (
    /* Backdrop — click outside to close */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-dune bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
                {formatCategory(place.category)}
                {google?.priceLevel && (
                  <span className="font-normal">
                    {" "}&middot;{" "}
                    {formatPriceLevel(google.priceLevel)}
                  </span>
                )}
                {place.distanceFromBasekm !== undefined && (
                  <span className="font-normal">
                    {" "}
                    &middot;{" "}
                    {formatDistance(place.distanceFromBasekm)} from base area
                  </span>
                )}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-bark leading-tight">
                {place.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 mt-0.5 rounded-xl p-2 text-umber hover:bg-sand transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ── Address ────────────────────────────────────────────── */}
          {google?.address && (
            <p className="mt-4 text-sm leading-6 text-umber">
              {google.address}
            </p>
          )}

          {/* ── Hours ──────────────────────────────────────────────── */}
          {(google?.isOpenNow !== undefined ||
            (google?.openingHours && google.openingHours.length > 0)) && (
            <div className="mt-3">
              {google.isOpenNow !== undefined && (
                <p
                  className={`text-sm font-medium ${
                    google.isOpenNow ? "text-sage" : "text-stone-500"
                  }`}
                >
                  {google.isOpenNow ? "Open now" : "Closed now"}
                </p>
              )}
              {google.openingHours && google.openingHours.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {google.openingHours.map((line, i) => (
                    <p key={i} className="text-xs text-umber leading-5">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Rating ─────────────────────────────────────────────── */}
          {displayRating !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-medium text-bark">
                ★ {displayRating.toFixed(1)}
              </span>
              {displayReviewCount !== undefined && (
                <span className="text-sm text-umber">
                  ({displayReviewCount.toLocaleString()} reviews)
                </span>
              )}
            </div>
          )}

          {/* ── Meal context chips ─────────────────────────────────── */}
          {google?.servesMeals && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {google.servesMeals.breakfast && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Breakfast
                </span>
              )}
              {google.servesMeals.lunch && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Lunch
                </span>
              )}
              {google.servesMeals.dinner && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Dinner
                </span>
              )}
              {google.servesMeals.coffee && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Coffee
                </span>
              )}
              {google.servesMeals.takeout && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Takeout
                </span>
              )}
              {google.servesMeals.dineIn && (
                <span className="rounded-full border border-dune bg-cream px-2.5 py-0.5 text-xs text-umber">
                  Dine-in
                </span>
              )}
            </div>
          )}

          {/* ── Editorial summary ──────────────────────────────────── */}
          {google?.editorialSummary && (
            <p className="mt-4 text-sm leading-6 text-umber italic border-l-2 border-dune pl-3">
              &ldquo;{google.editorialSummary}&rdquo;
            </p>
          )}

          {/* ── No Google data fallback note ───────────────────────── */}
          {!google && (
            <p className="mt-4 text-xs text-stone-400">
              Address and hours not available from this data source.
            </p>
          )}

          {/* ── Confidence notes ───────────────────────────────────── */}
          <div className="mt-5 border-t border-dune pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              Trustay confidence notes
            </p>

            {hasConfidenceSignals && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {confidence.workFit !== undefined && (
                  <ModalBadge
                    label="Work fit"
                    value={formatWorkFit(confidence.workFit)}
                    tier={getWorkFitTier(confidence.workFit)}
                  />
                )}
                {confidence.wifiConfidence !== undefined && (
                  <ModalBadge
                    label="Wi-Fi"
                    value={formatWifi(confidence.wifiConfidence)}
                    tier={getWifiTier(confidence.wifiConfidence)}
                  />
                )}
                {confidence.noiseRisk !== undefined && (
                  <ModalBadge
                    label="Noise"
                    value={formatNoiseRisk(confidence.noiseRisk)}
                    tier={getNoiseTier(confidence.noiseRisk)}
                  />
                )}
                {confidence.routineFit !== undefined && (
                  <ModalBadge
                    label="Routine fit"
                    value={formatRoutineFit(confidence.routineFit)}
                    tier={getRoutineFitTier(confidence.routineFit)}
                  />
                )}
                {confidence.convenience !== undefined && (
                  <ModalBadge
                    label="Convenience"
                    value={formatConvenience(confidence.convenience)}
                    tier={getConvenienceTier(confidence.convenience)}
                  />
                )}
                {confidence.quickMealFit !== undefined && (
                  <ModalBadge
                    label="Quick meal"
                    value={formatQuickMealFit(confidence.quickMealFit)}
                    tier={
                      confidence.quickMealFit === "high"
                        ? "verified"
                        : confidence.quickMealFit === "low"
                        ? "uncertain"
                        : "neutral"
                    }
                  />
                )}
                {confidence.routineSupport !== undefined && (
                  <ModalBadge
                    label="Routine fit"
                    value={formatRoutineSupport(confidence.routineSupport)}
                    tier={
                      confidence.routineSupport === "high"
                        ? "verified"
                        : confidence.routineSupport === "low"
                        ? "uncertain"
                        : "neutral"
                    }
                  />
                )}
              </div>
            )}

            <p className="mt-3 text-sm leading-6 text-umber">
              {place.explanation}
            </p>
          </div>

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {google?.mapsUrl && (
              <a
                href={google.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl bg-bark px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-colors"
              >
                Open in Maps ↗
              </a>
            )}
            {google?.website && (
              <a
                href={google.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl border border-dune bg-white px-4 py-2.5 text-sm font-medium text-bark hover:bg-cream transition-colors"
              >
                {place.category === "food" ? "Menu / Website ↗" : "Website ↗"}
              </a>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-xl border border-dune bg-white px-4 py-2.5 text-sm font-medium text-umber hover:bg-cream transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
