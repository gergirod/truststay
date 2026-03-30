"use client";

import { track } from "@/lib/analytics";

interface Props {
  slug: string;
  label: string;
  category: string;
  /** "early" = thin OSM data, product experience may be limited */
  coverage?: "early";
}

/**
 * Map category labels to default intent params.
 * These are inferred from the category the user was browsing — not a commitment,
 * just a sensible starting point that fires BestBaseCard on arrival.
 * workStyle defaults to "light" for activity categories (most activity-first
 * remote workers don't have heavy work demands), except work hubs which are heavy.
 */
const CATEGORY_INTENT: Record<string, string> = {
  "Surf":              "purpose=surf&workStyle=light&dailyBalance=purpose_first",
  "Dive":              "purpose=dive&workStyle=light&dailyBalance=purpose_first",
  "Hike":              "purpose=hike&workStyle=balanced&dailyBalance=purpose_first",
  "Yoga & wellness":   "purpose=yoga&workStyle=light&dailyBalance=purpose_first",
  "Kite & wind":       "purpose=kite&workStyle=light&dailyBalance=purpose_first",
  "Remote work hubs":  "purpose=work_first&workStyle=heavy&dailyBalance=work_first",
};

export function DestinationPill({ slug, label, category, coverage }: Props) {
  const intentParams = CATEGORY_INTENT[category];
  const href = intentParams ? `/city/${slug}?${intentParams}` : `/city/${slug}`;
  const isEarly = coverage === "early";

  return (
    <a
      href={href}
      title={isEarly ? "Early coverage — some sections may be limited" : undefined}
      onClick={() =>
        track("destination_clicked", { slug, label, category, intent_prefilled: !!intentParams, coverage: coverage ?? "full" })
      }
      className={`flex-shrink-0 sm:flex-shrink rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        isEarly
          ? "border-dune/60 bg-white text-umber/50 hover:border-dune hover:text-umber"
          : "border-dune bg-white text-bark hover:border-coral/50 hover:bg-[#FDF3EF] hover:text-coral"
      }`}
    >
      {label}
      {isEarly && <span className="ml-1.5 text-[10px] font-normal opacity-60">·</span>}
    </a>
  );
}
