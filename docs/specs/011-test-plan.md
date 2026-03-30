# 011 — Test Plan

All tests in `/src/tests/`. Use Vitest or Jest.

---

## Unit tests

### extractIntent.test.ts

```ts
describe("extractIntent", () => {
  it("parses surf + work from message", async () => {
    const result = await extractIntent(
      "where should i stay in popoyo for 2 weeks to surf, work remotely, keep my routine, gym nearby, nice coffee"
    );
    expect(result.destination).toBe("Popoyo");
    expect(result.main_activity).toBe("surf");
    expect(result.work_mode).toBe("balanced");
    expect(result.routine_needs).toContain("gym");
    expect(result.routine_needs).toContain("laptop_cafe");
    expect(result.duration_days).toBe(14);
    expect(result.transport_assumption).toBe("unknown");
  });

  it("does not invent budget when not mentioned", async () => {
    const result = await extractIntent("surf popoyo 2 weeks work remotely");
    expect(result.budget_level).toBeNull();
  });

  it("detects heavy work mode", async () => {
    const result = await extractIntent("full remote work, 8 hours a day, need good wifi");
    expect(result.work_mode).toBe("heavy");
  });
});
```

### adjustWeights.test.ts

```ts
describe("adjustWeights", () => {
  it("increases internet weight for heavy work", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, {
      ...baseProfile,
      work_mode: "heavy"
    });
    expect(weights.internet_reliability).toBeGreaterThan(DEFAULT_WEIGHTS.internet_reliability);
    expect(weights.activity_access).toBeLessThan(DEFAULT_WEIGHTS.activity_access);
  });

  it("weights always sum to 1.0", () => {
    const profiles = [lightSurf, heavyWork, routineFirst, premiumComfort];
    for (const profile of profiles) {
      const weights = adjustWeights(DEFAULT_WEIGHTS, profile);
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("increases routine_support when gym in routine_needs", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, {
      ...baseProfile,
      routine_needs: ["gym"]
    });
    expect(weights.routine_support).toBeGreaterThan(DEFAULT_WEIGHTS.routine_support);
  });
});
```

### scoring.service.test.ts

```ts
describe("scoreMicroArea", () => {
  it("guasacate scores higher than south_playa for surf + balanced work", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, surfBalancedProfile);
    const guasacate = scoreMicroArea(guasacateEvidence, weights, surfBalancedProfile);
    const southPlaya = scoreMicroArea(southPlayaEvidence, weights, surfBalancedProfile);
    expect(guasacate.final_score).toBeGreaterThan(southPlaya.final_score);
  });

  it("fires no_work_infra penalty for heavy work in thin area", () => {
    const weights = adjustWeights(DEFAULT_WEIGHTS, heavyWorkProfile);
    const card = scoreMicroArea(thinAreaEvidence, weights, heavyWorkProfile);
    expect(card.penalties.some(p => p.id === "no_work_infra_heavy_work")).toBe(true);
    expect(card.constraint_breakers.length).toBeGreaterThan(0);
  });

  it("fires no_gym penalty when routine needs gym and no gym found", () => {
    const profile = { ...baseProfile, routine_needs: ["gym"] };
    const evidence = { ...guasacateEvidence, routine: { ...guasacateEvidence.routine, gym: { found: false } } };
    const card = scoreMicroArea(evidence, adjustWeights(DEFAULT_WEIGHTS, profile), profile);
    expect(card.penalties.some(p => p.id === "no_gym_when_required")).toBe(true);
  });
});
```

### penalties.service.test.ts

```ts
describe("evaluatePenalties", () => {
  it("applies transport penalty for scooter-required area with unknown transport", () => {
    const penalties = evaluatePenalties(
      { ...evidence, friction: { requires_scooter_for_daily_life: true } },
      { ...profile, transport_assumption: "unknown" }
    );
    expect(penalties.some(p => p.id === "no_grocery_walkable")).toBe(true);
  });

  it("hard penalties appear in constraint_breakers", () => {
    const penalties = evaluatePenalties(noWorkInfraEvidence, heavyWorkProfile);
    const hardPenalties = penalties.filter(p => p.is_hard);
    expect(hardPenalties.length).toBeGreaterThan(0);
  });
});
```

### ranking.test.ts

```ts
describe("rankMicroAreas", () => {
  it("ranks by final_score descending", () => {
    const result = rankMicroAreas([guasacateCard, southPlayaCard, santanaCard]);
    expect(result.rankings[0].final_score).toBeGreaterThanOrEqual(result.rankings[1].final_score);
  });

  it("pushes constraint_breaker areas below clean areas", () => {
    const withConstraint = { ...guasacateCard, final_score: 8.5, constraint_breakers: ["no wifi"] };
    const withoutConstraint = { ...southPlayaCard, final_score: 7.0, constraint_breakers: [] };
    const result = rankMicroAreas([withConstraint, withoutConstraint]);
    expect(result.rankings[0].micro_area_id).toBe(withoutConstraint.micro_area_id);
  });
});
```

### schema-validation.test.ts

```ts
describe("FinalOutputSchema", () => {
  it("validates a complete Popoyo output", () => {
    const output = buildPopoyoFixtureOutput();
    expect(() => FinalOutputSchema.parse(output)).not.toThrow();
  });

  it("rejects output with missing required fields", () => {
    const incomplete = { user_profile: {} };
    expect(() => FinalOutputSchema.parse(incomplete)).toThrow();
  });

  it("rejects output with score out of range", () => {
    const withBadScore = { ...validOutput, candidate_micro_areas: [{ scores: { activity_access: 11 } }] };
    expect(() => FinalOutputSchema.parse(withBadScore)).toThrow();
  });
});
```

---

## Integration tests

### full-flow.test.ts

```ts
it("Popoyo surf + heavy work produces valid structured output", async () => {
  const output = await runRecommendationEngine({
    citySlug: "popoyo",
    cityName: "Popoyo",
    country: "Nicaragua",
    intent: { purpose: "surf", workStyle: "heavy", dailyBalance: "work_first" }
  });

  // Schema valid
  expect(() => FinalOutputSchema.parse(output)).not.toThrow();
  // Has micro-areas
  expect(output.candidate_micro_areas.length).toBeGreaterThanOrEqual(2);
  // Ranking exists
  expect(output.ranking.length).toBeGreaterThanOrEqual(2);
  // Recommendation exists
  expect(output.recommendation.top_pick).toBeTruthy();
  expect(output.recommendation.why_it_wins.length).toBeGreaterThan(0);
});
```

---

## Edge case tests

```ts
describe("edge cases", () => {
  it("handles unknown budget gracefully", async () => {
    const output = await runRecommendationEngine({ ...popoyoInput, intent: { ...popoyoInput.intent, budget: null } });
    expect(output.unknowns.some(u => u.includes("budget"))).toBe(true);
    expect(() => FinalOutputSchema.parse(output)).not.toThrow();
  });

  it("handles unknown transport gracefully", async () => {
    const output = await runRecommendationEngine({ ...popoyoInput });
    expect(output.assumptions.some(a => a.includes("transport"))).toBe(true);
  });

  it("handles destination with no micro-area data", async () => {
    const output = await runRecommendationEngine({ citySlug: "unknown-island", cityName: "Unknown Island", country: "Somewhere", intent: baseIntent });
    expect(output.candidate_micro_areas.length).toBeGreaterThanOrEqual(1);
    expect(output.candidate_micro_areas[0].confidence).toBeLessThan(0.5);
  });
});
```
