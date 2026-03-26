import type { Place, PlaceConfidence } from "@/types";
import {
  formatCategory,
  formatWorkFit,
  formatWifi,
  formatNoiseRisk,
  formatRoutineFit,
  formatConvenience,
  formatBestForTag,
  formatDistance,
} from "@/lib/format";

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

export function PlaceCard({ place }: Props) {
  const { confidence } = place;

  const hasConfidenceSignals =
    confidence.workFit !== undefined ||
    confidence.wifiConfidence !== undefined ||
    confidence.noiseRisk !== undefined ||
    confidence.routineFit !== undefined ||
    confidence.convenience !== undefined;

  return (
    <div className="rounded-2xl border border-dune bg-white p-5 shadow-sm">
      {/* Name + meta */}
      <p className="text-base font-semibold text-bark">{place.name}</p>
      <p className="mt-1 text-xs text-umber">
        {formatCategory(place.category)}
        {place.distanceKm !== undefined && (
          <> &middot; {formatDistance(place.distanceKm)} away</>
        )}
      </p>

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
        <p className="text-sm leading-6 text-umber">
          {place.explanation}
        </p>
      </div>
    </div>
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
    // Mist/sage: strongest positive signal — verified, high-confidence
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sage bg-mist px-2 py-0.5 text-xs">
        <span className="font-medium text-umber">{label}:</span>
        <span className="font-medium text-bark">{value}</span>
      </span>
    );
  }

  if (tier === "uncertain") {
    // White/dune border: weak/unknown signal — visually quieter
    return (
      <span className="inline-flex items-center gap-1 rounded border border-dune bg-white px-2 py-0.5 text-xs">
        <span className="text-stone-400">{label}:</span>
        <span className="italic text-umber">{value}</span>
      </span>
    );
  }

  // Neutral: cream/dune — default mid-confidence signal
  return (
    <span className="inline-flex items-center gap-1 rounded border border-dune bg-cream px-2 py-0.5 text-xs">
      <span className="font-medium text-umber">{label}:</span>
      <span className="text-bark">{value}</span>
    </span>
  );
}
