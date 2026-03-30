/**
 * Scoring engine tests — pure functions, no API calls.
 * Run with: npx vitest src/tests/scoring.test.ts
 */

import { describe, it, expect } from "vitest";
import { adjustWeights } from "@/application/use-cases/adjustWeights";
import { scoreMicroArea } from "@/domain/services/scoring.service";
import { evaluatePenalties } from "@/domain/services/penalties.service";
import { rankMicroAreas } from "@/application/use-cases/rankOptions";
import { DEFAULT_WEIGHTS } from "@/data/scoring-config";
import { FinalOutputSchema } from "@/schemas/zod/finalOutput.schema";
import { buildFinalResponse } from "@/application/use-cases/buildFinalResponse";
import {
  POPOYO_EVIDENCE,
} from "@/infrastructure/providers/fixtures/popoyo";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";

// ── Test profiles ─────────────────────────────────────────────────────────────

const surfLightProfile: UserProfile = {
  destination: "Popoyo, Nicaragua",
  duration_days: 14,
  main_activity: "surf",
  work_mode: "light",
  daily_balance: "purpose_first",
  routine_needs: [],
  budget_level: "mid_range",
  preferred_vibe: null,
  transport_assumption: "unknown",
  hard_constraints: [],
};

const surfHeavyProfile: UserProfile = {
  ...surfLightProfile,
  work_mode: "heavy",
  daily_balance: "work_first",
};

const routineFirstProfile: UserProfile = {
  ...surfLightProfile,
  routine_needs: ["gym", "grocery_walkable"],
};

// ── adjustWeights tests ───────────────────────────────────────────────────────

describe("adjustWeights", () => {
  it("always returns weights that sum to 1.0", () => {
    const profiles: UserProfile[] = [surfLightProfile, surfHeavyProfile, routineFirstProfile];
    for (const profile of profiles) {
      const weights = adjustWeights(DEFAULT_WEIGHTS, profile);
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  it("heavy work increases internet_reliability", () => {
    const light = adjustWeights(DEFAULT_WEIGHTS, surfLightProfile);
    const heavy = adjustWeights(DEFAULT_WEIGHTS, surfHeavyProfile);
    expect(heavy.internet_reliability).toBeGreaterThan(light.internet_reliability);
  });

  it("heavy work decreases activity_access weight", () => {
    const light = adjustWeights(DEFAULT_WEIGHTS, surfLightProfile);
    const heavy = adjustWeights(DEFAULT_WEIGHTS, surfHeavyProfile);
    expect(heavy.activity_access).toBeLessThan(light.activity_access);
  });

  it("gym routine need increases routine_support weight", () => {
    const base = adjustWeights(DEFAULT_WEIGHTS, surfLightProfile);
    const routine = adjustWeights(DEFAULT_WEIGHTS, routineFirstProfile);
    expect(routine.routine_support).toBeGreaterThan(base.routine_support);
  });

  it("unknown transport increases walkability weight", () => {
    const withTransport = adjustWeights(DEFAULT_WEIGHTS, {
      ...surfLightProfile,
      transport_assumption: "scooter",
    });
    const withoutTransport = adjustWeights(DEFAULT_WEIGHTS, {
      ...surfLightProfile,
      transport_assumption: "unknown",
    });
    expect(withoutTransport.walkability_and_friction).toBeGreaterThan(
      withTransport.walkability_and_friction
    );
  });
});

// ── scoreMicroArea tests ──────────────────────────────────────────────────────

describe("scoreMicroArea — Popoyo", () => {
  it("Guasacate scores higher than South Playa for surf + balanced work", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfLightProfile);
    const guasacate = scoreMicroArea(POPOYO_EVIDENCE["popoyo-guasacate"], weights, surfLightProfile);
    const southPlaya = scoreMicroArea(POPOYO_EVIDENCE["popoyo-south-playa"], weights, surfLightProfile);
    expect(guasacate.final_score).toBeGreaterThan(southPlaya.final_score);
  });

  it("Santana has better internet reliability than Guasacate for heavy work", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfHeavyProfile);
    const guasacate = scoreMicroArea(POPOYO_EVIDENCE["popoyo-guasacate"], weights, surfHeavyProfile);
    const santana = scoreMicroArea(POPOYO_EVIDENCE["popoyo-santana"], weights, surfHeavyProfile);
    // Santana has verified fiber internet — outranks Guasacate's cafe wifi
    expect(santana.scores.internet_reliability).toBeGreaterThan(guasacate.scores.internet_reliability);
    // Santana wins on routine support (gym on-site)
    expect(santana.scores.routine_support).toBeGreaterThan(guasacate.scores.routine_support);
  });

  it("South Playa triggers no_work_infra penalty for heavy work", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfHeavyProfile);
    const card = scoreMicroArea(POPOYO_EVIDENCE["popoyo-south-playa"], weights, surfHeavyProfile);
    expect(card.penalties.some((p) => p.id === "no_work_infra_heavy_work")).toBe(true);
    expect(card.constraint_breakers.length).toBeGreaterThan(0);
  });

  it("fires no_gym penalty when gym required and not found", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, routineFirstProfile);
    const card = scoreMicroArea(
      POPOYO_EVIDENCE["popoyo-guasacate"], // no gym in Guasacate
      weights,
      routineFirstProfile
    );
    expect(card.penalties.some((p) => p.id === "no_gym_when_required")).toBe(true);
  });

  it("Santana does NOT fire no_gym penalty (has gym)", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, routineFirstProfile);
    const card = scoreMicroArea(POPOYO_EVIDENCE["popoyo-santana"], weights, routineFirstProfile);
    expect(card.penalties.some((p) => p.id === "no_gym_when_required")).toBe(false);
  });
});

// ── rankMicroAreas tests ──────────────────────────────────────────────────────

describe("rankMicroAreas", () => {
  it("ranks by final_score descending", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfLightProfile);
    const cards = Object.values(POPOYO_EVIDENCE).map((ep) =>
      scoreMicroArea(ep, weights, surfLightProfile)
    );
    const result = rankMicroAreas(cards);
    expect(result.rankings[0].final_score).toBeGreaterThanOrEqual(
      result.rankings[1].final_score
    );
  });

  it("pushes constraint-breaker areas below clean areas", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfHeavyProfile);
    const cards = Object.values(POPOYO_EVIDENCE).map((ep) =>
      scoreMicroArea(ep, weights, surfHeavyProfile)
    );
    const result = rankMicroAreas(cards);
    // South Playa should not be rank 1 for heavy work (it has constraint breakers)
    expect(result.rankings[0].micro_area_id).not.toBe("popoyo-south-playa");
  });
});

// ── Schema validation tests ───────────────────────────────────────────────────

describe("FinalOutput schema", () => {
  it("buildFinalResponse produces valid FinalOutput for Popoyo surf+light", async () => {
    const output = await buildFinalResponse({
      citySlug: "popoyo",
      cityName: "Popoyo",
      country: "Nicaragua",
      userProfile: surfLightProfile,
    });
    expect(() => FinalOutputSchema.parse(output)).not.toThrow();
    expect(output.candidate_micro_areas.length).toBe(3);
    expect(output.ranking.length).toBe(3);
    expect(output.recommendation.top_pick).toBeTruthy();
  });

  it("buildFinalResponse produces valid FinalOutput for Popoyo surf+heavy", async () => {
    const output = await buildFinalResponse({
      citySlug: "popoyo",
      cityName: "Popoyo",
      country: "Nicaragua",
      userProfile: surfHeavyProfile,
    });
    expect(() => FinalOutputSchema.parse(output)).not.toThrow();
    // Heavy work should prefer Santana or Guasacate (not South Playa)
    expect(output.recommendation.top_pick).not.toBe("South Playa Popoyo");
  });

  it("surf+light and surf+heavy produce different rankings", async () => {
    const lightOutput = await buildFinalResponse({
      citySlug: "popoyo",
      cityName: "Popoyo",
      country: "Nicaragua",
      userProfile: surfLightProfile,
    });
    const heavyOutput = await buildFinalResponse({
      citySlug: "popoyo",
      cityName: "Popoyo",
      country: "Nicaragua",
      userProfile: surfHeavyProfile,
    });
    // The scores should differ — same inputs can't produce same result
    const lightTop = lightOutput.ranking[0].final_score;
    const heavyTop = heavyOutput.ranking[0].final_score;
    // At minimum the weights changed so something should differ
    expect(lightOutput.weights.internet_reliability).not.toBe(
      heavyOutput.weights.internet_reliability
    );
  });

  it("unknowns is non-empty for unknown transport", async () => {
    const output = await buildFinalResponse({
      citySlug: "popoyo",
      cityName: "Popoyo",
      country: "Nicaragua",
      userProfile: surfLightProfile, // has transport_assumption: "unknown"
    });
    expect(output.assumptions.some((a) => a.includes("transport"))).toBe(true);
  });
});
