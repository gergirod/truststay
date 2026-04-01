/**
 * Penalties service — pure function, no API calls.
 *
 * Evaluates all penalty rules against an EvidencePack + UserProfile
 * and returns the list of applicable Penalty objects.
 */

import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";
import type { DimensionScores, Penalty } from "@/schemas/zod/scoreCard.schema";
import { PENALTY_CONFIG, SCORING, DISTANCE_THRESHOLDS } from "@/data/scoring-config";

export function evaluatePenalties(
  evidence: EvidencePack,
  profile: UserProfile,
  scores: DimensionScores
): Penalty[] {
  const penalties: Penalty[] = [];

  const apply = (key: keyof typeof PENALTY_CONFIG) => {
    penalties.push({ ...PENALTY_CONFIG[key] });
  };

  // ── Hard penalties ──────────────────────────────────────────────────────────

  // No work infra for heavy work
  if (
    profile.work_mode === "heavy" &&
    evidence.work.coworkings.length === 0 &&
    !evidence.work.has_coliving_with_workspace &&
    !evidence.work.work_cafes.some((c) => c.confirmed_wifi)
  ) {
    apply("no_work_infra_heavy_work");
  }

  // No reliable wifi for heavy work
  if (
    profile.work_mode === "heavy" &&
    scores.internet_reliability < SCORING.min_internet_score_heavy_work &&
    !hasPenalty(penalties, "no_work_infra_heavy_work") // don't double-penalize
  ) {
    apply("no_reliable_wifi_heavy_work");
  }

  // No gym when gym is required
  if (
    profile.routine_needs.includes("gym") &&
    (!evidence.routine.gym?.found ||
      (evidence.routine.gym.distance_km ?? 0) > SCORING.gym_hard_penalty_km)
  ) {
    apply("no_gym_when_required");
  }

  // Activity inaccessible without transport
  if (
    profile.transport_assumption === "unknown" &&
    !evidence.friction.activity_walkable &&
    evidence.friction.requires_scooter_for_daily_life
  ) {
    const activityFirstIntent =
      profile.main_activity === "surf" ||
      profile.main_activity === "dive" ||
      profile.main_activity === "hike" ||
      profile.main_activity === "kite" ||
      profile.daily_balance === "purpose_first";
    if (activityFirstIntent) {
      // In many activity destinations, scooter access is normal and should not hard-fail all zones.
      apply("activity_requires_transport_unknown");
    } else {
      apply("activity_inaccessible_no_transport");
    }
  }

  // ── Soft penalties ──────────────────────────────────────────────────────────

  // Grocery not walkable with unknown transport
  if (
    profile.transport_assumption === "unknown" &&
    !evidence.friction.grocery_walkable &&
    evidence.routine.grocery?.found
  ) {
    apply("no_grocery_walkable");
  }

  // No pharmacy within range
  if (
    !evidence.routine.pharmacy?.found ||
    (evidence.routine.pharmacy.distance_km ?? 0) > DISTANCE_THRESHOLDS.pharmacy_nearby_km
  ) {
    apply("no_pharmacy_nearby");
  }

  // Limited food for long stay
  if (
    (profile.duration_days ?? 0) > SCORING.food_long_stay_min_days &&
    scores.food_and_coffee < SCORING.food_long_stay_min_score
  ) {
    apply("limited_food_long_stay");
  }

  // Strong activity + poor work tension (non-light work)
  if (
    profile.work_mode !== "light" &&
    scores.activity_access > SCORING.activity_poor_work_activity_min &&
    scores.work_environment < SCORING.activity_poor_work_work_max
  ) {
    apply("strong_activity_poor_work");
  }

  // Thin evidence
  if (evidence.confidence === "low") {
    apply("thin_evidence");
  }

  return penalties;
}

function hasPenalty(penalties: Penalty[], id: string): boolean {
  return penalties.some((p) => p.id === id);
}
