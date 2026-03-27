import type { CityIntro as CityIntroData } from "@/data/cityIntros";

const ACTIVITY_LABELS: Record<NonNullable<CityIntroData["activity"]>, string> = {
  surf:  "Surf",
  dive:  "Dive",
  hike:  "Hike",
  yoga:  "Yoga",
  kite:  "Kite",
  work:  "Base",
};

interface Props {
  intro: CityIntroData | null | undefined;
}

export function CityIntro({ intro }: Props) {
  if (!intro) return null;

  return (
    <div className="border-l-2 border-teal-400 pl-4">
      <p className="text-sm leading-7 text-umber">{intro.summary}</p>
      {(intro.activity || intro.bestMonths) && (
        <p className="mt-2 text-xs text-stone-400">
          {intro.activity && (
            <span className="font-semibold text-teal-600 uppercase tracking-wide mr-2">
              {ACTIVITY_LABELS[intro.activity]}
            </span>
          )}
          {intro.bestMonths && (
            <span>Best months: {intro.bestMonths}</span>
          )}
        </p>
      )}
    </div>
  );
}
