import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
  centroidLat?: number;
  centroidLon?: number;
}

export function RecommendedAreaCard({
  summary,
  centroidLat,
  centroidLon,
}: Props) {
  const isLowConfidence = summary.confidence === "low";

  const mapsUrl =
    centroidLat !== undefined && centroidLon !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${centroidLat},${centroidLon}`
      : null;

  return (
    <div className="rounded-2xl border border-dune bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
        Suggested base area
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <p className="text-xl font-semibold tracking-tight text-bark">
          {summary.recommendedArea}
        </p>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-dune bg-cream px-3 py-1.5 text-xs font-medium text-umber hover:bg-dune transition-colors"
            title="View area on Google Maps"
          >
            View on map ↗
          </a>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-umber">
        {summary.areaReason ??
          (isLowConfidence
            ? "Limited data for this city — this is a general suggestion to start around the center, not a verified area recommendation."
            : "This is where work spots, gyms, and food options seem to cluster. A useful starting point — not a precise neighborhood boundary.")}
      </p>
    </div>
  );
}
