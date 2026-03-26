import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

export function RecommendedAreaCard({ summary }: Props) {
  const isLowConfidence = summary.confidence === "low";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        Suggested base area
      </p>
      <p className="mt-3 text-xl font-semibold text-stone-900">
        {summary.recommendedArea}
      </p>

      {isLowConfidence ? (
        <p className="mt-3 text-sm leading-relaxed text-amber-700">
          We found limited data for this city, so this is a general suggestion
          to start around the center. Not a verified area recommendation.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          This is where work spots, gyms, and food options seem to cluster. A
          useful starting point — not a precise neighborhood boundary.
        </p>
      )}
    </div>
  );
}
