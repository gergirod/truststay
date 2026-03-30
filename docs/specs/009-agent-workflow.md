# 009 — Agent Workflow

## End-to-end flow

```
Input: { citySlug, intent, message? }
        ↓
1. NORMALIZE INPUT
        ↓
2. EXTRACT INTENT → UserProfile
        ↓
3. FILL DEFAULTS (Assumptions)
        ↓
4. ADJUST WEIGHTS → DecisionWeights
        ↓
5. DISCOVER MICRO-AREAS → MicroArea[]
        ↓
6. COLLECT EVIDENCE (parallel per micro-area) → EvidencePack[]
        ↓
7. SCORE EACH MICRO-AREA → ScoreCard[]
        ↓
8. APPLY PENALTIES
        ↓
9. RANK → RankingResult
        ↓
10. BUILD RECOMMENDATION → Recommendation
        ↓
11. NARRATE (LLM explains) → StayFitNarrative
        ↓
12. RENDER → FinalOutput (+ BestBaseCard narrativeText)
```

---

## Step-by-step detail

### 1. Normalize input

- Validate `citySlug` exists in known destinations OR mark as thin destination
- Parse `intent` from URL params or request body
- If `message` is present, pass to intent extractor

### 2. Extract intent

Run `extractIntent(message, intent)`:
- If `intent` is fully specified (purpose + workStyle + dailyBalance), pass through directly
- If `message` is present, use `gpt-4.1-mini` to extract additional signals:
  - duration, routine needs, budget, transport, vibe
- Return `UserProfile`

LLM extraction prompt rules:
```
Extract ONLY what is explicitly stated or clearly implied.
Do not invent budget, transport, or vibe unless stated.
Mark as null if not mentioned.
```

### 3. Fill defaults

For any `null` fields in `UserProfile`, apply defaults and record as `Assumption`:
- `transport_assumption = null` → `"unknown"` + assumption: "Transport assumption unknown — penalizing areas requiring scooter/car"
- `duration_days = null` → assumption: "Duration unknown — assuming 14-day stay for weight calculation"
- `budget_level = null` → assumption: "Budget unknown — using neutral budget scoring"

### 4. Adjust weights

Run `adjustWeights(DEFAULT_WEIGHTS, userProfile)`.
Always renormalize so sum = 1.0.
Record as part of `FinalOutput.weights`.

### 5. Discover micro-areas

Strategy:
1. Check fixture file (`/src/infrastructure/providers/fixtures/{citySlug}.ts`)
2. Check `CURATED_NEIGHBORHOODS` for known neighborhoods
3. Run `discoverMicroAreasViaAgent(destination, activity)` using Google Text Search
4. Fallback: single "Central {cityName}" micro-area

Return 2–4 `MicroArea[]`.

### 6. Collect evidence (parallel)

For each `MicroArea`, run all collectors in parallel:
```ts
const evidencePacks = await Promise.all(
  microAreas.map(ma => collectAllEvidence(ma, userProfile))
);
```

Each `collectAllEvidence` runs:
- `collectRemoteWorkEvidence(ma)` — uses enrichment agent tools internally
- `collectActivityEvidence(ma, activity)`
- `collectRoutineEvidence(ma)`
- `collectFrictionEvidence(ma, userProfile)`
- `collectAccommodationEvidence(ma, userProfile)`
- `collectFoodEvidence(ma)`
- `collectSleepEvidence(ma)`
- `collectBudgetEvidence(ma, userProfile)`
- `collectVibeEvidence(ma, userProfile)`

### 7. Score each micro-area

For each `EvidencePack`, run `scoreMicroArea(evidencePack, weights, userProfile)`.
This is a pure function — no API calls.

### 8. Apply penalties

Penalties are evaluated inside `scoreMicroArea` via `penaltiesService.evaluate(evidencePack, userProfile)`.
Hard penalties escalate to `constraint_breakers`.

### 9. Rank

Run `rankMicroAreas(scoreCards)`.
Rule: micro-areas with `constraint_breakers` are pushed below those without (unless all have them).

### 10. Build recommendation

Run `buildRecommendation(rankingResult, scoreCards, evidencePacks, userProfile)`.
This produces a fully structured `Recommendation` with no LLM involvement.

### 11. Narrate (LLM explains only)

Pass `Recommendation + top ScoreCard + top EvidencePack` to the LLM with a grounding prompt:
```
You are given a deterministic scoring result. Your job is to narrate it clearly.
Do not change the ranking. Do not invent facts.
Write the 5 BestBaseCard sections from the data provided.
```

Output maps to `StayFitNarrative`:
```ts
{
  whyItFits: recommendation.why_it_wins.join(" "),
  dailyRhythm: "...",    // from evidence: activity time + work spot + hours
  walkingOptions: "...", // from evidence: walkable food/coffee
  planAround: recommendation.main_tradeoffs.join(" ") + warnings,
  logistics: "..."       // from routine evidence: grocery/pharmacy/transport
}
```

### 12. Render final output

Assemble `FinalOutput`:
```ts
{
  user_profile: userProfile,
  weights: adjustedWeights,
  candidate_micro_areas: scoreCards.map(toOutputArea),
  ranking: rankingResult.rankings,
  recommendation: recommendation,
  assumptions: assumptions,
  unknowns: unknowns
}
```

---

## When to stop and return partial confidence

1. Evidence collection returns empty for all micro-areas → return single micro-area with `confidence: 0.2`, mark all dimensions as `Unknown`
2. Google API fails → fall back to fixture data; if no fixture, return partial
3. LLM narration fails → return `narrativeText: null` (BestBaseCard handles null gracefully)
4. Scoring completes but < 2 micro-areas → still return ranking with single option

---

## When to mark unknowns explicitly

Any time evidence is missing that would change scoring:
- Wifi quality unknown → Unknown: "Internet reliability at {name} unverified"
- Gym presence unknown → Unknown: "Gym availability near {area} not found"
- Pricing unknown → Unknown: "Accommodation pricing at {name} not available"

Rule: **explicit unknown > silent assumption**
