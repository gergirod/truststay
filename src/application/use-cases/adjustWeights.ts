/**
 * adjustWeights — pure function.
 *
 * Takes default DecisionWeights and adjusts them based on UserProfile.
 * Always renormalizes so sum = 1.0.
 * No side effects, fully deterministic.
 */

import type { DecisionWeights } from "@/schemas/zod/decisionWeights.schema";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";
import { DEFAULT_WEIGHTS, WEIGHT_ADJUSTMENTS } from "@/data/scoring-config";

export function adjustWeights(
  defaults: DecisionWeights = DEFAULT_WEIGHTS,
  profile: UserProfile
): DecisionWeights {
  const w = { ...defaults };

  // Work intensity adjustments
  if (profile.work_mode === "heavy") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.heavy_work);
  } else if (profile.work_mode === "light") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.light_work);
  }

  // Daily balance adjustments
  if (profile.daily_balance === "purpose_first") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.daily_balance_purpose_first);
  } else if (profile.daily_balance === "work_first") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.daily_balance_work_first);
  }

  // Routine needs
  if (profile.routine_needs.includes("gym")) {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.routine_needs_gym);
  }

  // Long stay
  if ((profile.duration_days ?? 0) > 14) {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.long_stay);
  }

  // Budget conscious
  if (profile.budget_level === "budget") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.budget_conscious);
  }

  // Unknown transport
  if (profile.transport_assumption === "unknown") {
    applyDeltas(w, WEIGHT_ADJUSTMENTS.unknown_transport);
  }

  // Clamp negatives to 0
  for (const key of Object.keys(w) as (keyof DecisionWeights)[]) {
    w[key] = Math.max(0, w[key]);
  }

  // Renormalize to sum = 1.0
  return renormalize(w);
}

function applyDeltas(
  weights: DecisionWeights,
  deltas: Partial<Record<keyof DecisionWeights, number>>
): void {
  for (const [key, delta] of Object.entries(deltas) as [keyof DecisionWeights, number][]) {
    weights[key] = (weights[key] ?? 0) + delta;
  }
}

function renormalize(weights: DecisionWeights): DecisionWeights {
  const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  const result = {} as DecisionWeights;
  for (const key of Object.keys(weights) as (keyof DecisionWeights)[]) {
    result[key] = Math.round((weights[key] / total) * 1000) / 1000;
  }
  // Fix floating point drift — add/subtract from largest weight
  const sumNow = Object.values(result).reduce((a, b) => a + b, 0);
  const drift = Math.round((1.0 - sumNow) * 1000) / 1000;
  if (drift !== 0) {
    const largest = (Object.keys(result) as (keyof DecisionWeights)[]).reduce((a, b) =>
      result[a] > result[b] ? a : b
    );
    result[largest] = Math.round((result[largest] + drift) * 1000) / 1000;
  }
  return result;
}
