/**
 * Scoring service — pure functions, no API calls, deterministic.
 *
 * Given an EvidencePack + DecisionWeights + UserProfile,
 * produces a ScoreCard with dimension scores, penalties, and final score.
 */

import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";
import type { DecisionWeights } from "@/schemas/zod/decisionWeights.schema";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";
import type { ScoreCard, DimensionScores, Penalty } from "@/schemas/zod/scoreCard.schema";
import { evaluatePenalties } from "./penalties.service";
import { DISTANCE_THRESHOLDS } from "@/data/scoring-config";

// ── Dimension scorers ─────────────────────────────────────────────────────────

function scoreActivityAccess(evidence: EvidencePack): number {
  const { main_spot_distance_km, main_spot_walkable, additional_spots } = evidence.activity;

  if (main_spot_distance_km === null) return 1;

  let base: number;
  if (main_spot_walkable || main_spot_distance_km <= DISTANCE_THRESHOLDS.activity_walkable_km) {
    base = 9;
  } else if (main_spot_distance_km <= DISTANCE_THRESHOLDS.activity_close_km) {
    base = 6.5;
  } else if (main_spot_distance_km <= 5) {
    base = 4.5;
  } else {
    base = 2;
  }

  // Bonus for multiple activity spots
  const bonus = Math.min(additional_spots.length, 2) * 0.5;
  return Math.min(10, base + bonus);
}

function scoreInternetReliability(evidence: EvidencePack): number {
  const { work } = evidence;

  // Start from estimate
  let score = work.internet_score_estimate;

  // Validate against structural evidence
  if (work.coworkings.length > 0 && work.best_wifi_confirmed) {
    score = Math.max(score, 7);
  } else if (work.coworkings.length > 0) {
    score = Math.max(score, 5.5);
  } else if (work.work_cafes.some((c) => c.confirmed_wifi)) {
    score = Math.max(score, 6);
  } else if (work.work_cafes.length > 0) {
    score = Math.max(score, 4);
  } else if (!work.best_wifi_confirmed && work.wifi_review_mentions.length === 0) {
    score = Math.min(score, 3);
  }

  return clamp(score);
}

function scoreWorkEnvironment(evidence: EvidencePack): number {
  const { work } = evidence;

  if (work.has_coliving_with_workspace && work.best_wifi_confirmed) return 9;
  if (work.has_coliving_with_workspace) return 8;
  if (work.coworkings.length > 0) {
    const bestCoworking = work.coworkings.reduce(
      (best, c) => (c.rating ?? 0) > (best.rating ?? 0) ? c : best,
      work.coworkings[0]
    );
    let score = 7.5;
    if ((bestCoworking.rating ?? 0) >= 4.5) score += 1;
    if (bestCoworking.pricing) score += 0.5;
    return Math.min(10, score);
  }
  if (work.work_cafes.some((c) => c.confirmed_wifi)) return 6;
  if (work.work_cafes.length > 0) return 4.5;
  return 1.5;
}

function scoreRoutineSupport(evidence: EvidencePack): number {
  let score = 0;
  const { routine } = evidence;

  // Gym: up to 3 points
  if (routine.gym?.found) {
    const dist = routine.gym.distance_km ?? 99;
    if (dist <= DISTANCE_THRESHOLDS.gym_walkable_km) score += 3;
    else if (dist <= DISTANCE_THRESHOLDS.gym_accessible_km) score += 2;
    else score += 1;
  }

  // Grocery: up to 3 points
  if (routine.grocery?.found) {
    if (routine.grocery.walkable) score += 3;
    else if ((routine.grocery.distance_km ?? 99) <= DISTANCE_THRESHOLDS.grocery_nearby_km) score += 2;
    else score += 1;
  }

  // Pharmacy: up to 2 points
  if (routine.pharmacy?.found) {
    const dist = routine.pharmacy.distance_km ?? 99;
    if (dist <= DISTANCE_THRESHOLDS.pharmacy_walkable_km) score += 2;
    else if (dist <= DISTANCE_THRESHOLDS.pharmacy_nearby_km) score += 1;
  }

  // Daily café structure: up to 2 points (check food evidence)
  const morningCafe = evidence.food.cafes.find((c) => {
    const open = c.opens_at ?? "09:00";
    return parseInt(open.replace(":", "")) <= 700; // opens at or before 7am
  });
  if (morningCafe) score += 2;
  else if (evidence.food.cafes.length > 0) score += 1;

  // Scale 0–10 (max raw = 10)
  return clamp(score);
}

function scoreWalkabilityAndFriction(evidence: EvidencePack): number {
  const { friction } = evidence;

  // Count how many essentials are walkable
  let walkableCount = 0;
  if (friction.work_spot_walkable) walkableCount++;
  if (friction.activity_walkable) walkableCount++;
  if (friction.grocery_walkable) walkableCount++;

  if (walkableCount === 3) return 9.5;
  if (walkableCount === 2 && !friction.requires_scooter_for_daily_life) return 7.5;
  if (walkableCount === 2) return 6.5;
  if (walkableCount === 1 && !friction.requires_car_for_any_essential) return 5;
  if (walkableCount === 1) return 3.5;
  if (friction.requires_car_for_any_essential) return 1.5;
  return 2.5; // scooter required, no car required
}

function scoreFoodAndCoffee(evidence: EvidencePack): number {
  const { food } = evidence;
  const walkableCafes = food.cafes.filter(
    (c) => c.distance_km <= DISTANCE_THRESHOLDS.food_walkable_km
  );
  const walkableRestaurants = food.restaurants.filter(
    (r) => r.distance_km <= DISTANCE_THRESHOLDS.food_walkable_km
  );
  const laptopFriendlyCafes = food.cafes.filter((c) => c.laptop_friendly);

  let score = food.food_score_estimate;

  // Validate structurally
  if (walkableCafes.length >= 2 && laptopFriendlyCafes.length >= 1 && walkableRestaurants.length >= 2) {
    score = Math.max(score, 8.5);
  } else if (walkableCafes.length >= 1 && walkableRestaurants.length >= 1) {
    score = Math.max(score, 6.5);
  } else if (food.cafes.length > 0) {
    score = Math.max(score, 4);
  }

  return clamp(score);
}

function scoreSleepNoise(evidence: EvidencePack): number {
  return clamp(evidence.sleep.sleep_score_estimate);
}

function scoreBudgetValue(evidence: EvidencePack, profile: UserProfile): number {
  if (profile.budget_level === null) return 5; // neutral — unknown budget

  const { budget } = evidence;
  let score = budget.budget_score_estimate;

  // Cross-check: budget traveler + expensive area = lower score
  if (profile.budget_level === "budget" && (budget.avg_accommodation_per_night ?? 0) > 80) {
    score = Math.min(score, 4);
  }
  if (profile.budget_level === "premium" && (budget.avg_accommodation_per_night ?? 0) < 40) {
    score = Math.max(score, 6); // premium user, low price = good value
  }

  return clamp(score);
}

function scoreVibeMatch(evidence: EvidencePack, profile: UserProfile): number {
  if (!profile.preferred_vibe) return 5; // neutral — no preference

  const { vibe } = evidence;
  const tags = vibe.vibe_tags;

  const match: Record<string, string[]> = {
    social: ["surf_village", "social", "lively", "nightlife", "community"],
    local: ["local", "authentic", "off_the_beaten_path", "residential"],
    quiet: ["quiet", "peaceful", "remote", "secluded", "nature"],
  };

  const preferredTags = match[profile.preferred_vibe] ?? [];
  const matchCount = tags.filter((t) => preferredTags.includes(t)).length;

  if (matchCount >= 2) return Math.max(vibe.vibe_score_estimate, 8);
  if (matchCount === 1) return Math.max(vibe.vibe_score_estimate, 6);
  return Math.min(vibe.vibe_score_estimate, 5);
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export function scoreMicroArea(
  evidencePack: EvidencePack,
  weights: DecisionWeights,
  profile: UserProfile
): ScoreCard {
  const raw: DimensionScores = {
    activity_access: round(scoreActivityAccess(evidencePack)),
    internet_reliability: round(scoreInternetReliability(evidencePack)),
    work_environment: round(scoreWorkEnvironment(evidencePack)),
    routine_support: round(scoreRoutineSupport(evidencePack)),
    walkability_and_friction: round(scoreWalkabilityAndFriction(evidencePack)),
    food_and_coffee: round(scoreFoodAndCoffee(evidencePack)),
    sleep_noise_comfort: round(scoreSleepNoise(evidencePack)),
    budget_value: round(scoreBudgetValue(evidencePack, profile)),
    vibe_match: round(scoreVibeMatch(evidencePack, profile)),
    weighted_total: 0,
  };

  // Compute weighted total
  const weightedTotal =
    raw.activity_access * weights.activity_access +
    raw.internet_reliability * weights.internet_reliability +
    raw.work_environment * weights.work_environment +
    raw.routine_support * weights.routine_support +
    raw.walkability_and_friction * weights.walkability_and_friction +
    raw.food_and_coffee * weights.food_and_coffee +
    raw.sleep_noise_comfort * weights.sleep_noise_comfort +
    raw.budget_value * weights.budget_value +
    raw.vibe_match * weights.vibe_match;

  raw.weighted_total = round(weightedTotal);

  // Apply penalties
  const penalties = evaluatePenalties(evidencePack, profile, raw);

  const penaltySum = penalties.reduce((sum, p) => sum + p.value, 0);
  const finalScore = round(Math.max(0, weightedTotal - penaltySum));

  const hardPenalties = penalties.filter((p) => p.is_hard);
  const constraintBreakers = hardPenalties.map((p) => p.reason);

  // Compute confidence
  const confidence = computeConfidence(evidencePack, penalties);

  // Build strengths/weaknesses
  const dimensionEntries = Object.entries(raw).filter(([k]) => k !== "weighted_total") as [
    keyof Omit<DimensionScores, "weighted_total">,
    number,
  ][];

  const strengths = dimensionEntries
    .filter(([, v]) => v >= 7.5)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => dimensionLabel(k, raw[k as keyof DimensionScores]));

  const weaknesses = dimensionEntries
    .filter(([, v]) => v < 4.5)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([k]) => dimensionLabel(k, raw[k as keyof DimensionScores]));

  const bestFor = deriveBestFor(raw, profile);

  return {
    micro_area_id: evidencePack.micro_area_id,
    micro_area_name: evidencePack.micro_area_id, // overridden by caller with real name
    scores: raw,
    penalties,
    final_score: finalScore,
    confidence,
    strengths,
    weaknesses,
    constraint_breakers: constraintBreakers,
    best_for: bestFor,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.min(10, Math.max(0, v));
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

function computeConfidence(evidencePack: EvidencePack, penalties: Penalty[]): number {
  let confidence = 1.0;

  // Thin work evidence
  if (
    evidencePack.work.coworkings.length === 0 &&
    evidencePack.work.work_cafes.length === 0
  ) {
    confidence -= 0.2;
  }

  // No activity evidence
  if (evidencePack.activity.main_spot_distance_km === null) {
    confidence -= 0.15;
  }

  // No routine evidence at all
  if (!evidencePack.routine.gym?.found && !evidencePack.routine.grocery?.found) {
    confidence -= 0.1;
  }

  // Low evidence confidence marker
  if (evidencePack.confidence === "low") {
    confidence -= 0.2;
  } else if (evidencePack.confidence === "medium") {
    confidence -= 0.1;
  }

  // Each thin_evidence penalty
  const thinPenalties = penalties.filter((p) => p.id === "thin_evidence").length;
  confidence -= thinPenalties * 0.1;

  return round(Math.max(0.1, confidence));
}

function dimensionLabel(key: string, score: number): string {
  const labels: Record<string, string> = {
    activity_access: "Activity access",
    internet_reliability: "Internet reliability",
    work_environment: "Work environment",
    routine_support: "Routine support",
    walkability_and_friction: "Walkability",
    food_and_coffee: "Food & coffee",
    sleep_noise_comfort: "Sleep comfort",
    budget_value: "Budget value",
    vibe_match: "Vibe match",
  };
  return `${labels[key] ?? key}: ${score}/10`;
}

function deriveBestFor(scores: DimensionScores, profile: UserProfile): string[] {
  const tags: string[] = [];
  if (scores.activity_access >= 7.5 && scores.work_environment >= 6) {
    tags.push(`${profile.main_activity} + ${profile.work_mode} work`);
  }
  if (scores.routine_support >= 7) tags.push("routine-first stays");
  if (scores.walkability_and_friction >= 8) tags.push("car-free living");
  if (scores.budget_value >= 7) tags.push("budget-conscious travelers");
  if (scores.sleep_noise_comfort >= 8) tags.push("quiet / deep work");
  if (tags.length === 0) tags.push("general stay");
  return tags;
}
