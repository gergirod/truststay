# 003 — Domain Model

## Core objects

---

### UserProfile

**Purpose**: Normalized representation of who the user is and what they need.
Derived from `StayIntent` + natural language input.

```ts
interface UserProfile {
  destination: string;           // "Popoyo, Nicaragua"
  duration_days: number | null;  // null = unknown, do not block
  main_activity: StayPurpose;    // "surf" | "dive" | "hike" | "yoga" | "kite" | "work_first" | "exploring"
  work_mode: WorkStyle;          // "light" | "balanced" | "heavy"
  daily_balance: DailyBalance;   // "purpose_first" | "balanced" | "work_first"
  routine_needs: RoutineNeed[];  // ["gym", "grocery_walkable", "pharmacy_nearby"]
  budget_level: BudgetLevel | null;  // null = unknown
  preferred_vibe: VibePreference | null;
  transport_assumption: TransportAssumption;  // "walking" | "scooter" | "car" | "unknown"
  hard_constraints: string[];    // ["must_have_gym", "must_have_coworking"]
}
```

**Invariants**:
- `destination` is always required
- `main_activity` and `work_mode` always present after intent extraction
- `budget_level = null` is valid — do not block or guess
- `transport_assumption = "unknown"` triggers penalty for scooter-dependent micro-areas

---

### DecisionWeights

**Purpose**: How much each dimension matters for THIS user's stay.
Derived deterministically from `UserProfile`. Not user-configured — inferred.

```ts
interface DecisionWeights {
  activity_access: number;           // 0.0–1.0
  internet_reliability: number;
  work_environment: number;
  routine_support: number;
  walkability_and_friction: number;
  food_and_coffee: number;
  sleep_noise_comfort: number;
  budget_value: number;
  vibe_match: number;
  // Invariant: sum of all = 1.0
}
```

**Invariants**:
- All values ≥ 0
- Sum must equal 1.0 (enforced before scoring)
- Derived from `adjustWeights(defaults, userProfile)` — never manually set

---

### MicroArea

**Purpose**: A distinct sub-zone within a destination that a user could actually base themselves in.
More specific than a neighborhood, defined by walkable radius from a central point.

```ts
interface MicroArea {
  id: string;             // "popoyo-guasacate"
  name: string;           // "Guasacate"
  destination: string;    // "Popoyo, Nicaragua"
  center: { lat: number; lon: number };
  radius_km: number;      // typically 0.5–2.0
  description: string;    // 1-sentence character description
  tags: MicroAreaTag[];   // ["surf_village", "walkable", "thin_infra"]
}
```

**Invariants**:
- `id` is unique per destination
- `center` is a real coordinate
- Multiple micro-areas per destination form the candidate set

---

### EvidencePack

**Purpose**: All collected structured evidence for one micro-area across all dimensions.
Built by the evidence-collection phase. Input to scoring.

```ts
interface EvidencePack {
  micro_area_id: string;
  collected_at: string;    // ISO timestamp
  confidence: EvidenceConfidence;  // "high" | "medium" | "low"

  work: WorkEvidence;
  activity: ActivityEvidence;
  routine: RoutineEvidence;
  friction: FrictionEvidence;
  accommodation: AccommodationEvidence;
  food_and_coffee: FoodEvidence;
  sleep: SleepEvidence;
  budget: BudgetEvidence;
  vibe: VibeEvidence;
}
```

**Each sub-evidence type is defined in `006-tool-contracts.md`.**

**Invariants**:
- `micro_area_id` must reference a known `MicroArea`
- `confidence: "low"` means evidence is thin — scoring must mark confidence accordingly
- Missing evidence = `null` fields — never invent data

---

### ScoreCard

**Purpose**: Scored result for one micro-area. Output of scoring engine.

```ts
interface ScoreCard {
  micro_area_id: string;
  micro_area_name: string;
  scores: DimensionScores;    // all 9 dimensions, 0–10
  weighted_total: number;     // sum(score_i * weight_i), 0–10
  penalties: Penalty[];
  final_score: number;        // weighted_total minus penalty sum, clamped 0–10
  confidence: number;         // 0.0–1.0, derived from evidence confidence
  strengths: string[];        // evidence-grounded strings
  weaknesses: string[];
  constraint_breakers: string[];  // hard constraint violations — escalate to ranking
  best_for: string[];         // "surf + light work", "heavy work"
}
```

**Invariants**:
- `final_score` = `max(0, weighted_total - sum(penalties.map(p => p.value)))`
- `constraint_breakers` can disqualify a micro-area from top ranking
- `confidence` < 0.4 means output is marked low-confidence in BestBaseCard

---

### Penalty

**Purpose**: A scored deduction applied to a micro-area when a constraint is violated.

```ts
interface Penalty {
  id: string;           // "no_work_infra_heavy_work"
  reason: string;       // human-readable
  value: number;        // deduction from weighted_total
  is_hard: boolean;     // hard = escalated to constraint_breakers
  dimension: DimensionKey;
}
```

**Invariants**:
- `value` > 0 always (it's a deduction)
- `is_hard = true` → always included in `constraint_breakers`
- Penalties are configurable in `scoring-config.ts`

---

### RankingResult

**Purpose**: Ordered list of micro-areas by final_score, with metadata.

```ts
interface RankingResult {
  rankings: Array<{
    rank: number;
    micro_area_id: string;
    micro_area_name: string;
    final_score: number;
    has_constraint_breakers: boolean;
  }>;
  top_pick: string;  // micro_area_id
}
```

---

### Recommendation

**Purpose**: Human-facing explanation of the ranking. LLM-generated but grounded in ScoreCards.

```ts
interface Recommendation {
  top_pick: string;
  why_it_wins: string[];     // evidence-grounded reasons
  main_tradeoffs: string[];  // honest tradeoffs for the top pick
  alternatives: AlternativeRecommendation[];
  warnings: string[];        // re-stated constraint_breakers or data gaps
  what_would_change_the_ranking: string[];
}
```

**Invariants**:
- Every item in `why_it_wins` must cite a real score or evidence fact
- `warnings` must include all `constraint_breakers` from the winning micro-area
- Never include items that contradict the deterministic ScoreCard

---

### Assumption

**Purpose**: Something the system assumed because the user didn't specify it.
Always surfaced explicitly — never hidden.

Examples:
- "Assumed transport: unknown (no scooter/car stated)"
- "Assumed duration: 14 days (common for this destination)"
- "Assumed budget: mid-range based on work mode"

---

### Unknown

**Purpose**: Something we couldn't find evidence for. Surfaced explicitly.
Different from Assumption — Unknown means we tried and couldn't find it.

Examples:
- "Gym availability near Guasacate is unknown — no Google data found"
- "Internet speed at Waves & Wifi could not be verified from available reviews"

---

## Relationships

```
UserProfile
  → (adjustWeights) → DecisionWeights
  → (discoverMicroAreas) → MicroArea[]
       → (collectEvidence) → EvidencePack
            → (scoreMicroArea) → ScoreCard
                 → (rankMicroAreas) → RankingResult
                      → (buildRecommendation) → Recommendation
                           → (buildFinalResponse) → FinalOutput
```
