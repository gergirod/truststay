import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

export function RecommendedAreaCard({ summary }: Props) {
  const isLowConfidence = summary.confidence === "low";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        Recommended base area
      </p>
      <p className="mt-3 text-xl font-semibold text-stone-900">
        {summary.recommendedArea}
      </p>

      {isLowConfidence ? (
        <p className="mt-3 text-sm text-amber-700 leading-relaxed">
          Low confidence — limited place data was found for this city. This is a
          general central-area recommendation, not a verified neighborhood
          analysis.
        </p>
      ) : (
        <p className="mt-3 text-sm text-stone-500 leading-relaxed">
          Derived from the density of work spots, gyms, and food options in the
          area. Not a verified neighborhood boundary.
        </p>
      )}
    </div>
  );
}
