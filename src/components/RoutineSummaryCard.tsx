import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

const confidenceNote: Record<CitySummary["confidence"], string> = {
  low: "Limited data for this area — treat this as an early signal, not a final answer.",
  medium: "Moderate data coverage — most key places are likely accounted for.",
  high: "",
};

const confidenceColor: Record<CitySummary["confidence"], string> = {
  low: "text-umber",
  medium: "text-stone-400",
  high: "text-stone-400",
};

export function RoutineSummaryCard({ summary }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-dune bg-white shadow-sm">
      {/* Top accent bar — sage marks this as the primary metric card */}
      <div className="h-[3px] bg-sage" />
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
          How functional is this base?
        </p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight text-bark">
            {summary.routineScore}
          </span>
          <span className="text-base text-stone-400">/ 100</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {summary.summaryText}
        </p>
        {confidenceNote[summary.confidence] && (
          <p className={`mt-3 text-xs leading-5 ${confidenceColor[summary.confidence]}`}>
            {confidenceNote[summary.confidence]}
          </p>
        )}
      </div>
    </div>
  );
}
