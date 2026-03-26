import type { CitySummary } from "@/types";

interface Props {
  summary: CitySummary;
}

const confidenceColor: Record<CitySummary["confidence"], string> = {
  low: "text-amber-600",
  medium: "text-stone-600",
  high: "text-emerald-700",
};

export function RoutineSummaryCard({ summary }: Props) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
        Routine summary
      </p>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight text-stone-900">
          {summary.routineScore}
        </span>
        <span className="text-base text-stone-400">/ 100</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        {summary.summaryText}
      </p>
      <p className={`mt-3 text-xs font-medium ${confidenceColor[summary.confidence]}`}>
        Data confidence: {summary.confidence}
      </p>
    </div>
  );
}
