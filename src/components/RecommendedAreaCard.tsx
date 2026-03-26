import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

export function RecommendedAreaCard({ summary }: Props) {
  const isLowConfidence = summary.confidence === "low";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        Suggested base area
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-stone-900">
        {summary.recommendedArea}
      </p>

      {isLowConfidence ? (
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Limited data for this city — this is a general suggestion to start
          around the center, not a verified area recommendation.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-500">
          This is where work spots, gyms, and food options seem to cluster. A
          useful starting point — not a precise neighborhood boundary.
        </p>
      )}
    </div>
  );
}
