# 006 — Tool Contracts

These are abstract contracts. Implementations live in `src/infrastructure/providers/`.
They can be swapped between mock (fixtures) and live (Google Places + agent) without changing the scoring core.

---

## discoverMicroAreas

```ts
type DiscoverMicroAreas = (
  destination: string,
  activity: StayPurpose,
  userProfile: UserProfile
) => Promise<MicroArea[]>
```

**Purpose**: Find 2–4 distinct micro-areas within the destination that are realistic bases.

**Inputs**:
- `destination`: "Popoyo, Nicaragua"
- `activity`: influences which micro-areas are relevant (surf areas vs work districts)
- `userProfile`: full profile for context

**Outputs**: `MicroArea[]` — ordered from most obvious to most alternative

**Failure cases**:
- Unknown destination → return [] (caller marks destination as unsupported)
- Destination too small for micro-areas → return single "Central {destination}" area

**Fallback**: If no fixture and no Google data → single micro-area named "Central {destination}" with low confidence

---

## collectRemoteWorkEvidence

```ts
type CollectRemoteWorkEvidence = (
  microArea: MicroArea
) => Promise<WorkEvidence>

interface WorkEvidence {
  coworkings: WorkVenue[];
  work_cafes: WorkVenue[];
  has_coliving_with_workspace: boolean;
  coliving_name?: string;
  coliving_price_per_night?: number;
  best_wifi_confirmed: boolean;
  wifi_review_mentions: string[];   // direct quotes from reviews
  internet_score_estimate: number;  // 0–10 computed from above
}

interface WorkVenue {
  name: string;
  category: "coworking" | "cafe" | "coliving";
  distance_km: number;
  rating?: number;
  reviews_count?: number;
  confirmed_wifi: boolean;
  pricing?: string;   // e.g. "$8/day or $120/month"
  opening_hours?: string[];
  notable_review?: string;
}
```

**Failure cases**:
- No Google results → return empty arrays, `best_wifi_confirmed: false`, `internet_score_estimate: 3`
- Venue found but no reviews → WorkVenue with `confirmed_wifi: false`

---

## collectActivityEvidence

```ts
type CollectActivityEvidence = (
  microArea: MicroArea,
  activity: StayPurpose
) => Promise<ActivityEvidence>

interface ActivityEvidence {
  main_spot_distance_km: number | null;  // null = not found
  main_spot_name?: string;
  main_spot_walkable: boolean;
  additional_spots: ActivitySpot[];
  schools_or_rentals: ActivityVenue[];   // surf schools, dive shops, etc.
  seasonal_note?: string;
  activity_score_estimate: number;  // 0–10
}
```

---

## collectRoutineEvidence

```ts
type CollectRoutineEvidence = (
  microArea: MicroArea
) => Promise<RoutineEvidence>

interface RoutineEvidence {
  gym: { found: boolean; name?: string; distance_km?: number; rating?: number } | null;
  grocery: { found: boolean; name?: string; distance_km?: number; walkable: boolean } | null;
  pharmacy: { found: boolean; name?: string; distance_km?: number } | null;
  laundry: { found: boolean; distance_km?: number } | null;
  routine_score_estimate: number;  // 0–10
}
```

**Failure cases**:
- Not found → `{ found: false }` — never `null` for the container

---

## collectFrictionEvidence

```ts
type CollectFrictionEvidence = (
  microArea: MicroArea,
  userProfile: UserProfile
) => Promise<FrictionEvidence>

interface FrictionEvidence {
  work_spot_walkable: boolean;
  activity_walkable: boolean;
  grocery_walkable: boolean;
  requires_scooter_for_daily_life: boolean;
  requires_car_for_any_essential: boolean;
  typical_daily_friction_note: string;  // "All essentials within 5 min walk" or "Scooter needed for groceries"
  friction_score_estimate: number;  // 0–10 (10 = no friction)
}
```

---

## collectAccommodationEvidence

```ts
type CollectAccommodationEvidence = (
  microArea: MicroArea,
  userProfile: UserProfile
) => Promise<AccommodationEvidence>

interface AccommodationEvidence {
  options: AccommodationOption[];
  has_coliving: boolean;
  price_range_per_night: { min: number; max: number } | null;
  best_for_work_option?: string;  // name of most work-suitable accommodation
}

interface AccommodationOption {
  name: string;
  type: "coliving" | "hostel" | "airbnb" | "hotel" | "guesthouse";
  price_per_night?: number;
  has_workspace: boolean;
  has_fast_wifi: boolean;
  distance_to_activity_km?: number;
  rating?: number;
  notable_review?: string;
}
```

---

## scoreMicroArea

```ts
type ScoreMicroArea = (
  evidencePack: EvidencePack,
  weights: DecisionWeights,
  userProfile: UserProfile
) => ScoreCard
```

**Purpose**: Pure function. Deterministic. Testable. No API calls.

**Inputs**: fully collected evidence pack + weights derived from user profile
**Output**: `ScoreCard` with all 9 dimension scores, penalties, final score

**Failure cases**: Never fails — if evidence is thin, scores will be low with low confidence

---

## rankMicroAreas

```ts
type RankMicroAreas = (scoreCards: ScoreCard[]) => RankingResult
```

**Purpose**: Pure sort. Deterministic. Micro-areas with constraint_breakers go below those without, unless all have them.

---

## buildRecommendation

```ts
type BuildRecommendation = (
  rankingResult: RankingResult,
  scoreCards: ScoreCard[],
  evidencePacks: EvidencePack[],
  userProfile: UserProfile
) => Recommendation
```

**Purpose**: Builds the structured `Recommendation` from deterministic scoring results.
The LLM then narrates this into natural language.
