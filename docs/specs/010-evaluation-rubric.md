# 010 — Evaluation Rubric

How we judge whether the system is working correctly.

## 1. Recommendation relevance (0–5)

Score: Does the top-ranked micro-area match what a human expert would recommend for this intent?

| Score | Meaning |
|-------|---------|
| 5 | Expert agrees with ranking and reasons |
| 4 | Expert agrees with top pick, minor reason differences |
| 3 | Expert would accept but prefers a different pick |
| 2 | Expert disagrees with ranking |
| 1 | Ranking is clearly wrong |
| 0 | Output is nonsense |

Test: For Popoyo surf + heavy work, expert expects Rancho Santana or Waves&Wifi (bundled infra) over generic beach areas.

## 2. User-fit accuracy (0–5)

Score: Does the output accurately reflect the user's stated constraints?

- Routine needs present in `UserProfile` → must appear in scoring
- Hard constraints must generate penalties when violated
- Budget unknown must appear in `unknowns`, not guessed

## 3. Micro-area granularity (0–5)

Score: Is the recommendation at micro-area level, not destination level?

- 5: Distinct micro-areas with meaningful score differences
- 3: Micro-areas identified but scores are too similar
- 0: Destination-level only ("Popoyo is good for surf and work")

## 4. Work/routine sensitivity (0–5)

Score: Does changing `work_mode` or `routine_needs` change the ranking?

Test: Same destination, `work_mode = light` vs `work_mode = heavy` should produce different top pick or different score gap.

## 5. Tradeoff clarity (0–5)

Score: Are tradeoffs honest and specific?

- 5: "No grocery within walking distance — plan a weekly run to Rivas"
- 3: "Limited daily life options"
- 0: "Some areas may be more convenient than others"

## 6. Schema validity (pass/fail)

Every output must pass `FinalOutputSchema` Zod validation. No exceptions.

## 7. Explainability quality (0–5)

Score: Can a user understand WHY the winner won from the output alone?

- 5: Clear scoring visible, penalty visible, tradeoffs named
- 3: Winner is named, reasons are vague
- 0: "We recommend X" with no explanation

## 8. Extensibility (0–5)

Score: Can we add a new destination in < 30 minutes?

- 5: Add fixture file, test passes, UI renders
- 3: Requires multiple file changes
- 0: Destination-specific logic scattered across codebase

## Acceptance criteria for v1 (must pass all)

- [ ] Popoyo surf + heavy work → returns 3 micro-areas, Guasacate or Rancho Santana area wins
- [ ] Popoyo surf + light work → different ranking or score distribution than heavy work
- [ ] Missing gym when `routine_needs: ["gym"]` → penalty fires
- [ ] Unknown transport + scooter-required area → penalty fires
- [ ] `FinalOutput` always passes Zod validation
- [ ] Same inputs always produce same ranking (deterministic)
- [ ] `unknowns` array always non-empty for thin destinations
- [ ] LLM narration never contradicts deterministic ScoreCard
