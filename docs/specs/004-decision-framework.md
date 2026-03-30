# 004 — Decision Framework

## Overview

The decision framework is the step-by-step logic the engine applies from user intent to final recommendation. It is deterministic — given the same inputs, it always produces the same ranking.

The LLM's job is to **explain** the deterministic result, not to make the decision.

---

## Decision steps

### Step 1 — Parse intent

Input: `StayIntent` (from URL params) + optional natural language message
Output: `UserProfile`

Rules:
- `purpose` maps directly to `main_activity`
- `workStyle` maps directly to `work_mode`
- `dailyBalance` maps directly to `daily_balance`
- Natural language signals:
  - "don't break my routine" → `routine_needs: ["gym", "grocery_walkable"]`
  - "work remotely" + no explicit workStyle → default `balanced`
  - "nice coffee places to work" → `routine_needs: [..., "laptop_cafe"]`
  - "gym nearby" → `routine_needs: [..., "gym"]`
  - duration mentioned → `duration_days`
  - budget mentioned → `budget_level`
  - transport not mentioned → `transport_assumption: "unknown"`

### Step 2 — Adjust weights

Input: `UserProfile` + default `DecisionWeights`
Output: adjusted `DecisionWeights` (sum always = 1.0)

Default weights (see 005-scoring-model.md for rationale):
```
activity_access:         0.22
internet_reliability:    0.20
work_environment:        0.14
routine_support:         0.14
walkability_and_friction: 0.10
food_and_coffee:         0.08
sleep_noise_comfort:     0.05
budget_value:            0.04
vibe_match:              0.03
```

Adjustment rules:
- `work_mode = heavy` → +0.06 to `internet_reliability`, +0.04 to `work_environment`, −0.05 from `activity_access`, −0.05 from `vibe_match`
- `work_mode = light` → +0.05 to `activity_access`, −0.03 from `work_environment`, −0.02 from `internet_reliability`
- `daily_balance = purpose_first` → +0.05 to `activity_access`, −0.03 from `work_environment`, −0.02 from `internet_reliability`
- `daily_balance = work_first` → +0.04 to `work_environment`, +0.02 to `internet_reliability`, −0.03 from `activity_access`, −0.03 from `vibe_match`
- `routine_needs includes gym` → +0.04 to `routine_support`, −0.02 from `food_and_coffee`, −0.02 from `vibe_match`
- `duration_days > 14` → +0.03 to `routine_support`, −0.03 from `vibe_match`
- `budget_level = budget` → +0.04 to `budget_value`, −0.02 from `sleep_noise_comfort`, −0.02 from `vibe_match`
- `transport_assumption = unknown` → +0.03 to `walkability_and_friction`, −0.03 from `activity_access`

After all adjustments: renormalize so sum = 1.0.

### Step 3 — Discover micro-areas

Input: `destination`, `UserProfile`
Output: `MicroArea[]` (2–4 candidates)

Source priority:
1. Fixtures (if destination has a fixture file)
2. `CURATED_NEIGHBORHOODS` from `data/neighborhoods.ts`
3. Agent-discovered via Google Places Text Search

Each micro-area must have a `center` coordinate and a meaningful `description`.

### Step 4 — Collect evidence

Input: `MicroArea`, `UserProfile`
Output: `EvidencePack`

For each micro-area, run evidence collectors in parallel:
- `collectRemoteWorkEvidence` → wifi, coworkings, cafes
- `collectActivityEvidence` → surf break proximity, school/rental access
- `collectRoutineEvidence` → gym, grocery, pharmacy
- `collectFrictionEvidence` → transport needs, distances, scooter requirement
- `collectAccommodationEvidence` → options, pricing, coliving bundles
- `collectFoodEvidence` → cafes, restaurants, walking distance
- `collectSleepEvidence` → noise signals from reviews
- `collectBudgetEvidence` → price range of accommodation + daily costs
- `collectVibeEvidence` → crowd type, social vs quiet

### Step 5 — Score each micro-area

Input: `EvidencePack`, `DecisionWeights`, `UserProfile`
Output: `ScoreCard`

For each dimension, compute a raw score (0–10) from evidence.
Apply `dimension_weight × raw_score` to get weighted contribution.
Sum all weighted contributions → `weighted_total`.

Then apply penalties:
- Scan penalty rules against `EvidencePack` + `UserProfile`
- Each matching rule produces a `Penalty`
- `final_score = max(0, weighted_total - sum(penalties.value))`

### Step 6 — Rank

Input: `ScoreCard[]`
Output: `RankingResult`

Sort by `final_score` descending.
Flag micro-areas with `constraint_breakers` — they cannot be top pick unless all options have constraint breakers.

### Step 7 — Build recommendation

Input: `RankingResult`, `ScoreCard[]`, `EvidencePack[]`, `UserProfile`
Output: `Recommendation`

The recommendation is built deterministically from ScoreCards:
- `top_pick` = rank 1 micro-area
- `why_it_wins` = top scoring dimensions of winner, stated as evidence facts
- `main_tradeoffs` = lowest scoring dimensions of winner + any soft penalties
- `alternatives` = rank 2–3 with best_for + tradeoff statement
- `warnings` = all constraint_breakers from all micro-areas
- `what_would_change_the_ranking` = what user change would flip the winner

The LLM narrates this into natural language for BestBaseCard.

---

## Principles for remote workers

These are encoded directly in the scoring logic:

### 1. Internet is first-class
`internet_reliability` is always in the top 2 weights for any work_mode = balanced or heavy.
Unknown wifi → confidence deduction, not a score boost.

### 2. Routine is first-class
If `routine_needs` is non-empty, `routine_support` weight increases significantly.
Missing gym when "gym" is in `routine_needs` → hard penalty.

### 3. Bundled infrastructure beats fragmented infrastructure
A micro-area where surf + workspace + food are within 500m scores higher on `walkability_and_friction` than one where each requires a separate trip — even if the individual quality of each is equal.

Evidence signal: coliving with in-house workspace is worth +2 on `work_environment` even if a standalone coworking exists elsewhere.

### 4. Micro-area > destination-level reasoning
Never return a destination-level recommendation when micro-area evidence exists.
"Popoyo is good for surf + work" is a failure. "Guasacate vs South Playa — Guasacate wins for your profile" is the goal.

### 5. Transport assumption matters
If `transport_assumption = "unknown"` and a micro-area requires scooter for daily essentials → penalty.
Do not assume scooter availability unless stated.

### 6. Honesty about thin data
If evidence is thin (< 3 verified sources per dimension), mark `confidence` accordingly.
Thin evidence + high score = must surface `Unknown` items explicitly.
