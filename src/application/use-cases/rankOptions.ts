/**
 * rankMicroAreas — pure function.
 *
 * Sorts ScoreCards by final_score. Micro-areas with constraint_breakers
 * are pushed below those without — unless ALL micro-areas have constraint
 * breakers, in which case we rank by score normally.
 */

import type { ScoreCard } from "@/schemas/zod/scoreCard.schema";

export interface RankingResult {
  rankings: RankingEntry[];
  top_pick: string; // micro_area_id
}

export interface RankingEntry {
  rank: number;
  micro_area_id: string;
  micro_area_name: string;
  final_score: number;
  has_constraint_breakers: boolean;
}

export function rankMicroAreas(scoreCards: ScoreCard[]): RankingResult {
  if (scoreCards.length === 0) {
    return { rankings: [], top_pick: "" };
  }

  const allHaveConstraintBreakers = scoreCards.every(
    (c) => c.constraint_breakers.length > 0
  );

  const sorted = [...scoreCards].sort((a, b) => {
    // If not all have constraint breakers, clean areas come first
    if (!allHaveConstraintBreakers) {
      const aClean = a.constraint_breakers.length === 0;
      const bClean = b.constraint_breakers.length === 0;
      if (aClean && !bClean) return -1;
      if (!aClean && bClean) return 1;
    }
    // Within same tier, sort by final_score descending
    return b.final_score - a.final_score;
  });

  const rankings: RankingEntry[] = sorted.map((card, i) => ({
    rank: i + 1,
    micro_area_id: card.micro_area_id,
    micro_area_name: card.micro_area_name,
    final_score: card.final_score,
    has_constraint_breakers: card.constraint_breakers.length > 0,
  }));

  return {
    rankings,
    top_pick: sorted[0]?.micro_area_id ?? "",
  };
}
