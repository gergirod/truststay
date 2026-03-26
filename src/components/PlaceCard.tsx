import type { Place } from "@/types";
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

export function PlaceCard({ place }: Props) {
  const { confidence } = place;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-stone-900">{place.name}</p>
          <p className="mt-0.5 text-xs text-stone-400">
            {formatCategory(place.category)}
            {place.distanceKm !== undefined && (
              <> &middot; {formatDistance(place.distanceKm)} from center</>
            )}
          </p>
        </div>
      </div>

      {/* Confidence signals */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {confidence.workFit !== undefined && (
          <Badge label="Work fit" value={formatWorkFit(confidence.workFit)} />
        )}
        {confidence.wifiConfidence !== undefined && (
          <Badge label="Wi-Fi" value={formatWifi(confidence.wifiConfidence)} />
        )}
        {confidence.noiseRisk !== undefined && (
          <Badge
            label="Noise"
            value={formatNoiseRisk(confidence.noiseRisk)}
          />
        )}
        {confidence.routineFit !== undefined && (
          <Badge
            label="Routine fit"
            value={formatRoutineFit(confidence.routineFit)}
          />
        )}
        {confidence.convenience !== undefined && (
          <Badge
            label="Convenience"
            value={formatConvenience(confidence.convenience)}
          />
        )}
      </div>

      {/* Best-for tags */}
      {place.bestFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {place.bestFor.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600"
            >
              {formatBestForTag(tag)}
            </span>
          ))}
        </div>
      )}

      {/* Explanation */}
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        {place.explanation}
      </p>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded border border-stone-200 px-2 py-0.5 text-xs text-stone-600">
      <span className="font-medium text-stone-400">{label}:</span> {value}
    </span>
  );
}
