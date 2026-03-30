/**
 * generateRecommendation — pure function.
 *
 * Builds the structured Recommendation from deterministic ScoreCards.
 * No LLM involvement here — the LLM only narrates this result.
 */

import type { ScoreCard } from "@/schemas/zod/scoreCard.schema";
import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";
import type { Recommendation } from "@/schemas/zod/finalOutput.schema";
import type { RankingResult } from "./rankOptions";

export function generateRecommendation(
  rankingResult: RankingResult,
  scoreCards: ScoreCard[],
  evidencePacks: EvidencePack[],
  profile: UserProfile
): Recommendation {
  const topId = rankingResult.top_pick;
  const topCard = scoreCards.find((c) => c.micro_area_id === topId);

  if (!topCard) {
    return {
      top_pick: "unknown",
      why_it_wins: ["Insufficient data to make a recommendation"],
      main_tradeoffs: [],
      alternatives: [],
      warnings: ["No micro-area data available for this destination"],
      what_would_change_the_ranking: [],
    };
  }

  const topEvidence = evidencePacks.find((e) => e.micro_area_id === topId);

  // Build why_it_wins from top scoring dimensions
  const whyItWins = buildWhyItWins(topCard, topEvidence, profile);

  // Build tradeoffs from low-scoring dimensions + soft penalties
  const mainTradeoffs = buildTradeoffs(topCard, profile);

  // Build alternatives
  const alternatives = rankingResult.rankings
    .slice(1, 3)
    .map((entry) => {
      const card = scoreCards.find((c) => c.micro_area_id === entry.micro_area_id);
      return {
        name: entry.micro_area_name,
        best_for: card?.best_for[0] ?? "alternative stay",
        tradeoff: buildAlternativeTradeoff(card, topCard),
      };
    });

  // Collect all warnings from constraint_breakers across all areas
  const allWarnings = [
    ...topCard.constraint_breakers,
    ...scoreCards.flatMap((c) =>
      c.micro_area_id !== topId ? c.constraint_breakers.map((w) => `[${c.micro_area_name}] ${w}`) : []
    ),
  ];

  // What would change the ranking
  const whatWouldChange = buildWhatWouldChange(topCard, scoreCards, profile);

  return {
    top_pick: topCard.micro_area_name,
    why_it_wins: whyItWins,
    main_tradeoffs: mainTradeoffs,
    alternatives,
    warnings: [...new Set(allWarnings)], // deduplicate
    what_would_change_the_ranking: whatWouldChange,
  };
}

// ── Private builders ──────────────────────────────────────────────────────────

function buildWhyItWins(
  card: ScoreCard,
  evidence: EvidencePack | undefined,
  profile: UserProfile
): string[] {
  const reasons: string[] = [];

  // Top strength dimensions
  reasons.push(...card.strengths.slice(0, 2));

  // Activity fit
  if (card.scores.activity_access >= 7) {
    const actName = evidence?.activity.main_spot_name;
    const actDist = evidence?.activity.main_spot_distance_km;
    if (actName && actDist !== null && actDist !== undefined) {
      reasons.push(
        `${profile.main_activity} access: ${actName} is ${actDist < 0.5 ? "walkable" : `${actDist}km away`}`
      );
    }
  }

  // Work infra specific
  if (card.scores.work_environment >= 7 && evidence) {
    const coworking = evidence.work.coworkings[0];
    const coliving = evidence.work.has_coliving_with_workspace;
    if (coliving && evidence.work.coliving_name) {
      const price = evidence.work.coliving_price_per_night;
      reasons.push(
        `${evidence.work.coliving_name} coliving includes workspace${price ? ` (~$${price}/night)` : ""}`
      );
    } else if (coworking) {
      reasons.push(
        `${coworking.name} coworking nearby${coworking.pricing ? ` (${coworking.pricing})` : ""}`
      );
    }
  }

  return [...new Set(reasons)].slice(0, 4);
}

function buildTradeoffs(card: ScoreCard, profile: UserProfile): string[] {
  const tradeoffs: string[] = [];

  // Low-scoring dimensions become tradeoffs
  const dimLabels: Record<string, string> = {
    routine_support: "Limited routine support (gym/grocery/pharmacy)",
    walkability_and_friction: "Requires scooter or car for some daily essentials",
    food_and_coffee: "Limited food and coffee variety",
    internet_reliability: "Internet reliability not fully verified",
    sleep_noise_comfort: "Possible noise — check accommodation reviews",
    budget_value: "Higher price than typical for this area",
  };

  const dimensionsToCheck = [
    "routine_support",
    "walkability_and_friction",
    "food_and_coffee",
    "internet_reliability",
  ] as const;

  for (const dim of dimensionsToCheck) {
    const score = card.scores[dim];
    if (score < 5) {
      const label = dimLabels[dim];
      if (label) tradeoffs.push(label);
    }
  }

  // Soft penalties as tradeoffs
  const softPenalties = card.penalties.filter((p) => !p.is_hard);
  for (const p of softPenalties.slice(0, 2)) {
    if (!tradeoffs.includes(p.reason)) tradeoffs.push(p.reason);
  }

  return tradeoffs.slice(0, 3);
}

function buildAlternativeTradeoff(card: ScoreCard | undefined, winner: ScoreCard): string {
  if (!card) return "Lower overall score";

  const winnerScore = winner.final_score;
  const altScore = card.final_score;
  const diff = winnerScore - altScore;

  if (card.scores.activity_access > winner.scores.activity_access + 1) {
    return `Better activity access (+${(card.scores.activity_access - winner.scores.activity_access).toFixed(1)}) but weaker work infra`;
  }
  if (card.scores.budget_value > winner.scores.budget_value + 1) {
    return `Better budget value but scores ${diff.toFixed(1)} points lower overall`;
  }
  if (card.scores.sleep_noise_comfort > winner.scores.sleep_noise_comfort + 1) {
    return `Quieter area but weaker activity/work access`;
  }

  return `Scores ${diff.toFixed(1)} lower overall — better for: ${card.best_for[0] ?? "different priorities"}`;
}

function buildWhatWouldChange(
  winner: ScoreCard,
  allCards: ScoreCard[],
  profile: UserProfile
): string[] {
  const changes: string[] = [];

  // If work_mode changed
  if (profile.work_mode === "heavy") {
    changes.push("Switching to light work mode would increase weight on activity access, potentially changing the ranking");
  }

  // If transport was known
  if (profile.transport_assumption === "unknown") {
    changes.push("Having a scooter removes transport penalties — other areas may score higher");
  }

  // If gym wasn't required
  if (profile.routine_needs.includes("gym")) {
    changes.push("Not requiring a gym would remove that hard penalty from some areas");
  }

  // Close second place
  const second = allCards.find((c) => c.micro_area_id !== winner.micro_area_id);
  if (second && winner.final_score - second.final_score < 1.0) {
    changes.push(
      `${second.micro_area_name} is very close (${(winner.final_score - second.final_score).toFixed(1)} points) — improved work evidence there could flip the ranking`
    );
  }

  return changes.slice(0, 3);
}
