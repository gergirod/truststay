"use client";

import { useState } from "react";
import type { MicroAreaNarrative } from "@/lib/placeEnrichmentAgent";
import { MicroAreaBaseCard } from "@/components/MicroAreaBaseCard";

interface Props {
  microAreaNarratives: MicroAreaNarrative[];
  intent: string; // e.g. "surf + heavy work"
  cityName: string;
}

export function MicroAreaStack({ microAreaNarratives, intent, cityName }: Props) {
  const [showAll, setShowAll] = useState(false);

  // Always show winner + first 2; rest collapsed unless showAll
  const sorted = [...microAreaNarratives].sort((a, b) => a.rank - b.rank);
  const winnerArea = sorted[0];
  const otherAreas = sorted.slice(1);

  // How many non-winner areas to show collapsed
  const visibleOthers = showAll ? otherAreas : otherAreas.slice(0, 1);
  const hiddenCount = otherAreas.length - 1;

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
          {microAreaNarratives.length} micro-areas in {cityName}
        </p>
        <p className="mt-0.5 text-xs text-umber/60">
          Ranked by fit score for your profile
        </p>
      </div>

      <div className="space-y-4">
        {/* Winner always shown fully */}
        {winnerArea && (
          <MicroAreaBaseCard
            microArea={winnerArea}
            isWinner={true}
            intent={intent}
          />
        )}

        {/* Other areas — collapsed by default beyond first */}
        {visibleOthers.map((area) => (
          <MicroAreaBaseCard
            key={area.microAreaId}
            microArea={area}
            isWinner={false}
            intent={intent}
          />
        ))}

        {/* Show more / show less toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full rounded-xl border border-dune bg-cream px-4 py-3 text-sm text-umber transition-colors hover:bg-dune/20"
          >
            {showAll
              ? "Show less ↑"
              : `Show ${hiddenCount} more area${hiddenCount !== 1 ? "s" : ""} ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
