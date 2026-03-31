/**
 * Centralized scoring configuration.
 * No magic numbers anywhere else in the codebase — everything lives here.
 */

import type { DecisionWeights } from "@/schemas/zod";

// ── Default weights ───────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: DecisionWeights = {
  activity_access: 0.22,
  internet_reliability: 0.20,
  work_environment: 0.14,
  routine_support: 0.14,
  walkability_and_friction: 0.10,
  food_and_coffee: 0.08,
  sleep_noise_comfort: 0.05,
  budget_value: 0.04,
  vibe_match: 0.03,
};

// ── Weight adjustment deltas ──────────────────────────────────────────────────
// Applied by adjustWeights() use case. Deltas are added/subtracted from defaults.
// After all adjustments, weights are renormalized to sum = 1.0.

export const WEIGHT_ADJUSTMENTS = {
  heavy_work: {
    internet_reliability: +0.06,
    work_environment: +0.04,
    activity_access: -0.05,
    vibe_match: -0.05,
  },
  light_work: {
    activity_access: +0.05,
    work_environment: -0.03,
    internet_reliability: -0.02,
  },
  daily_balance_purpose_first: {
    activity_access: +0.05,
    work_environment: -0.03,
    internet_reliability: -0.02,
  },
  daily_balance_work_first: {
    work_environment: +0.04,
    internet_reliability: +0.02,
    activity_access: -0.03,
    vibe_match: -0.03,
  },
  routine_needs_gym: {
    routine_support: +0.04,
    food_and_coffee: -0.02,
    vibe_match: -0.02,
  },
  long_stay: {
    // duration > 14 days
    routine_support: +0.03,
    vibe_match: -0.03,
  },
  budget_conscious: {
    budget_value: +0.04,
    sleep_noise_comfort: -0.02,
    vibe_match: -0.02,
  },
  unknown_transport: {
    walkability_and_friction: +0.03,
    activity_access: -0.03,
  },
} as const;

// ── Distance thresholds (km) ──────────────────────────────────────────────────

export const DISTANCE_THRESHOLDS = {
  /** Activity is "walkable" if within this distance */
  activity_walkable_km: 0.5,
  /** Activity is "close" (scooter, not car) if within this */
  activity_close_km: 2.0,
  /** Work spot is "walkable" if within this */
  work_walkable_km: 0.8,
  /** Grocery is "walkable" if within this */
  grocery_walkable_km: 1.0,
  /** Grocery is "nearby" if within this */
  grocery_nearby_km: 2.0,
  /** Gym is "walkable" if within this */
  gym_walkable_km: 1.0,
  /** Gym is "accessible" if within this */
  gym_accessible_km: 2.5,
  /** Pharmacy is "walkable" if within this */
  pharmacy_walkable_km: 1.5,
  /** Pharmacy is "nearby" if within this */
  pharmacy_nearby_km: 3.0,
  /** Food option is "walkable" if within this */
  food_walkable_km: 0.5,
  /** All essentials within this = high walkability score */
  all_essentials_walkable_km: 1.0,
} as const;

// ── Penalty config ────────────────────────────────────────────────────────────

export const PENALTY_CONFIG = {
  no_work_infra_heavy_work: {
    id: "no_work_infra_heavy_work",
    value: 3.0,
    is_hard: true,
    dimension: "work_environment",
    reason: "No coworking or verified wifi cafe found — required for heavy work mode",
  },
  no_gym_when_required: {
    id: "no_gym_when_required",
    value: 2.5,
    is_hard: true,
    dimension: "routine_support",
    reason: "No gym found within 3km — required when gym is in routine needs",
  },
  activity_inaccessible_no_transport: {
    id: "activity_inaccessible_no_transport",
    value: 2.0,
    is_hard: true,
    dimension: "activity_access",
    reason: "Activity requires car or scooter but transport assumption is unknown",
  },
  activity_requires_transport_unknown: {
    id: "activity_requires_transport_unknown",
    value: 0.8,
    is_hard: false,
    dimension: "activity_access",
    reason: "Activity is not walkable and transport is unknown — scooter likely needed",
  },
  no_reliable_wifi_heavy_work: {
    id: "no_reliable_wifi_heavy_work",
    value: 2.0,
    is_hard: true,
    dimension: "internet_reliability",
    reason: "Internet reliability too low for heavy remote work",
  },
  no_grocery_walkable: {
    id: "no_grocery_walkable",
    value: 0.8,
    is_hard: false,
    dimension: "routine_support",
    reason: "Grocery requires scooter or car with unknown transport",
  },
  no_pharmacy_nearby: {
    id: "no_pharmacy_nearby",
    value: 0.5,
    is_hard: false,
    dimension: "routine_support",
    reason: "No pharmacy found within 3km",
  },
  limited_food_long_stay: {
    id: "limited_food_long_stay",
    value: 0.6,
    is_hard: false,
    dimension: "food_and_coffee",
    reason: "Limited food options for a stay longer than 7 days",
  },
  strong_activity_poor_work: {
    id: "strong_activity_poor_work",
    value: 1.0,
    is_hard: false,
    dimension: "work_environment",
    reason: "Strong activity access but poor work infrastructure — tension for balanced stays",
  },
  thin_evidence: {
    id: "thin_evidence",
    value: 0.5,
    is_hard: false,
    dimension: "internet_reliability",
    reason: "Evidence is thin — scores may not reflect reality",
  },
} as const;

export type PenaltyConfigKey = keyof typeof PENALTY_CONFIG;

// ── Scoring thresholds ────────────────────────────────────────────────────────

export const SCORING = {
  /** Minimum internet score that avoids hard penalty for heavy work */
  min_internet_score_heavy_work: 4,
  /** Minimum confidence to skip thin_evidence penalty */
  min_confidence_no_penalty: 0.4,
  /** Activity score threshold for "strong activity + poor work" penalty */
  activity_poor_work_activity_min: 7,
  activity_poor_work_work_max: 4,
  /** Food score threshold for long-stay penalty */
  food_long_stay_min_score: 4,
  food_long_stay_min_days: 7,
  /** Gym distance threshold for hard penalty */
  gym_hard_penalty_km: 3.0,
} as const;
