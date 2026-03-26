import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

const confidenceNote: Record<CitySummary["confidence"], string> = {
  low: "Based on limited data — score may not reflect reality.",
  medium: "Based on moderate data coverage.",
  high: "Based on strong data coverage.",
};

const confidenceColor: Record<CitySummary["confidence"], string> = {
  low: "text-amber-600",
  medium: "text-stone-400",
  high: "text-stone-400",
};

export function RoutineSummaryCard({ summary }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        Routine score
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight text-stone-900">
          {summary.routineScore}
        </span>
        <span className="text-base text-stone-300">/ 100</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        {summary.summaryText}
      </p>
      <p className={`mt-3 text-xs ${confidenceColor[summary.confidence]}`}>
        {confidenceNote[summary.confidence]}
      </p>
    </div>
  );
}
