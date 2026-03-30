# TrustStay — Branching Engine Implementation Plan v1

**Status:** Implementation brief, ready to build  
**Grounded in:** Existing codebase — `src/lib/scoring.ts`, `src/lib/overpass.ts`, `src/lib/confidence.ts`, `src/types/index.ts`  
**Scope:** Backend scoring engine + output contract. No frontend changes in this plan.

---

## 1. Implementation goal

We are adding a **personalized stay fit engine** alongside the existing generic routine score.

The existing `computeCitySummary` scores every city the same way — equal weight across cafés, coworkings, gyms, and food. It does not know why the user is there or how much they work.

The new engine, `computeStayFitScore`, takes the same place data and re-scores it based on a **`StayIntent`** — a structured object representing the user's purpose, work style, and vibe preference. It adds one new data dimension (daily-life essentials, fetched via a lightweight Overpass extension) and returns a richer output contract used by both the UI layer and the LLM narrative generator.

The existing `computeCitySummary` is **not replaced**. It continues to serve as the generic fallback when no intent has been provided. The new engine runs in parallel when intent is present.

**Three scoring dimensions — not two:**

The engine scores three distinct things:
1. **Work fit** — can the user actually work here, given how much they work?
2. **Purpose fit** — can the user do what they came for?
3. **Daily-life fit** — can the user live well here for 2–8 weeks without friction?

All three must produce a meaningfully different number across profiles. A recommendation that ignores daily-life fit is incomplete — it tells the user where to surf and where to work, but not whether they'll spend half their day on a scooter looking for groceries.

**The map is a trust and exploration layer**, not the primary recommendation surface. The engine's output should include spatial data sufficient to render: base zone, top work spots, purpose places, and daily-life essentials as map pins — supporting confidence in the recommendation rather than replacing it.

---

## 2. Existing functions and surfaces to modify

### `src/lib/scoring.ts`

The primary change target.

- `computeBaseCentroid` — no changes needed. Will be called before `computeStayFitScore` to provide the weighted centroid as a reference point.
- `computeCitySummary` — no changes. Kept as generic fallback.
- **New:** `computeStayFitScore(places, dailyLifePlaces, city, intent, areaName?)` — the personalized scoring function.

### `src/lib/overpass.ts`

Add a **lightweight parallel query** for daily-life essentials.

- `fetchPlaces` — no changes to existing query or output.
- **New:** `fetchDailyLifePlaces(city)` — fetches supermarkets, pharmacies, convenience stores. Returns a simple `DailyLifePlace[]`. These are **scoring signals only**, not shown as place cards in the UI.

### `src/types/index.ts`

Add new types:

- `StayPurpose`
- `WorkStyle`
- `VibePreference`
- `StayIntent`
- `DailyLifePlace`
- `StayFitResult`
- `FitProfile`

### `src/app/city/[slug]/page.tsx`

When `StayIntent` is available (from URL params initially, localStorage later):
- Call `fetchDailyLifePlaces` in parallel with existing `fetchPlaces`
- Call `computeStayFitScore` alongside existing `computeCitySummary`
- Pass `StayFitResult` to the display and narrative layers

---

## 3. The four v1 branching profiles

These four profiles cover the meaningful decision space for v1. Everything maps into one of them.

---

### Profile 1: `activity_light_work`

**Who:** Came for a specific activity (surf, dive, hike, yoga, kite). Work is background — a few hours async, no heavy infrastructure needs.

**Represents:** "I'm in El Salvador to surf. I need to keep up with Slack and a few async tasks, but I'm not running calls."

**Prioritizes:**
- Purpose access (distance to activity infrastructure)
- Daily-life convenience (food sustainability, grocery access)
- Relaxed work backup (a good café is enough)

**Penalizes:**
- Expensive coworking-centric areas with no activity access
- Over-optimized work clusters far from activity zones

**Weight vector:**

```
w_work    = 0.20
w_purpose = 0.45
w_life    = 0.35

Within work score:
  coworking weight    = 0.15
  high-workFit café   = 0.50
  wifi confidence     = 0.20
  noise risk          = 0.15 (soft, not critical)
```

---

### Profile 2: `activity_balanced_work`

**Who:** Came for activity but works seriously. Needs reliable infrastructure — not just a café backup. The tension between purpose and work is the core product value here.

**Represents:** "I'm going to Oaxaca to hike on weekends, but I'm running full work days Mon–Fri with video calls."

**Prioritizes:**
- Work infrastructure (coworkings, verified wifi, low noise)
- Purpose access within reasonable distance
- Daily-life support (food, recovery)

**Penalizes:**
- Areas where purpose access requires leaving the work zone (high friction)
- High-noise locations for call-heavy users
- Places with no coworkings if "work is the main thing"

**Weight vector:**

```
w_work    = 0.40
w_purpose = 0.25
w_life    = 0.35

Within work score:
  coworking weight    = 0.35
  high-workFit café   = 0.35
  wifi confidence     = 0.20
  noise risk          = 0.10
```

---

### Profile 3: `work_primary`

**Who:** Came mainly to work. Activity is incidental or absent. Daily life and work infrastructure are everything.

**Represents:** "I picked this city because it's cheaper, the timezone works, and I've heard the coworking scene is good. I'm not here to surf."

**Prioritizes:**
- Coworking quality and density
- Wifi confidence
- Noise environment
- Daily-life convenience (food proximity, grocery access, friction reduction)

**Penalizes:**
- Beach-adjacent noisy tourist strips
- Areas where work infrastructure is sparse
- Long distances to food or essentials

**Weight vector:**

```
w_work    = 0.55
w_purpose = 0.00
w_life    = 0.45

Within work score:
  coworking weight    = 0.50
  high-workFit café   = 0.25
  wifi confidence     = 0.15
  noise risk          = 0.10
```

---

### Profile 4: `generic`

**Who:** Exploring, undecided purpose, or no intent data provided. Falls back to the closest behavior to the existing TrustStay recommendation.

**Represents:** "I'm checking this destination out."

**Prioritizes:**
- Overall routine quality (balanced across all categories)
- Daily-life convenience (weighted higher than in existing generic score)

**Weight vector:**

```
w_work    = 0.40
w_purpose = 0.00
w_life    = 0.60

Within work score:
  equal weight across café, coworking, gym, food
```

Note: This profile produces output closest to the current `computeCitySummary`. It should feel like a slightly enriched version of the existing generic recommendation — not a radically different product.

---

## 4. Weight-vector approach

**Data structure:**

```typescript
// src/types/index.ts additions

export type StayPurpose =
  | "surf" | "dive" | "hike" | "yoga" | "kite"
  | "work_first" | "exploring";

export type WorkStyle = "light" | "balanced" | "heavy";
export type VibePreference = "social" | "local" | "quiet" | null;

export interface StayIntent {
  purpose: StayPurpose;
  workStyle: WorkStyle;
  vibe: VibePreference;
}

export type FitProfile =
  | "activity_light_work"
  | "activity_balanced_work"
  | "work_primary"
  | "generic";

interface DimensionWeights {
  work: number;      // 0–1, share of total score
  purpose: number;   // 0–1
  dailyLife: number; // 0–1
}

interface WorkSubWeights {
  coworking: number;
  highWorkFitCafe: number;
  wifiConfidence: number;
  noiseRisk: number;
}

interface ProfileConfig {
  label: FitProfile;
  weights: DimensionWeights;
  workSubWeights: WorkSubWeights;
}
```

**Profile config object:**

```typescript
// src/lib/scoring.ts

const PROFILE_CONFIGS: Record<FitProfile, ProfileConfig> = {
  activity_light_work: {
    label: "activity_light_work",
    weights: { work: 0.20, purpose: 0.45, dailyLife: 0.35 },
    workSubWeights: {
      coworking: 0.15, highWorkFitCafe: 0.50,
      wifiConfidence: 0.20, noiseRisk: 0.15
    },
  },
  activity_balanced_work: {
    label: "activity_balanced_work",
    weights: { work: 0.40, purpose: 0.25, dailyLife: 0.35 },
    workSubWeights: {
      coworking: 0.35, highWorkFitCafe: 0.35,
      wifiConfidence: 0.20, noiseRisk: 0.10
    },
  },
  work_primary: {
    label: "work_primary",
    weights: { work: 0.55, purpose: 0.00, dailyLife: 0.45 },
    workSubWeights: {
      coworking: 0.50, highWorkFitCafe: 0.25,
      wifiConfidence: 0.15, noiseRisk: 0.10
    },
  },
  generic: {
    label: "generic",
    weights: { work: 0.40, purpose: 0.00, dailyLife: 0.60 },
    workSubWeights: {
      coworking: 0.25, highWorkFitCafe: 0.25,
      wifiConfidence: 0.25, noiseRisk: 0.25
    },
  },
};
```

**Intent → profile mapping function:**

```typescript
export function resolveProfile(intent: StayIntent): FitProfile {
  if (intent.purpose === "work_first" || intent.purpose === "exploring") {
    return intent.purpose === "work_first" ? "work_primary" : "generic";
  }
  // Activity purpose: branch on work style
  return intent.workStyle === "light"
    ? "activity_light_work"
    : "activity_balanced_work";
}
```

This mapping is the complete routing table. Every input combination resolves to one of four well-defined profiles with no ambiguity.

---

## 5. Unknown and low-confidence handling

Three failure modes, three honest responses:

### Purpose data unknown (no relevant OSM tags found)

**Example:** User selects "dive" but the city has no `amenity=dive_shop` within the search radius.

**Score behavior:** Set `purposeFitScore = null`. Do not substitute 0 (that implies bad access) and do not omit (that implies we checked). Use `null` to mean "we don't know."

**Total score adjustment:** When `purposeFitScore = null`, redistribute the purpose weight proportionally across work and daily-life: `w_work += intent.purpose_weight * 0.5`, `w_life += intent.purpose_weight * 0.5`.

**Output behavior:**
```
purposeAccessLevel: "unknown"
purposeAccessNote: "We couldn't verify dive infrastructure from available data — confirm locally before committing."
```

**Map behavior:** No purpose pins shown. The base zone and work spots are still shown.

---

### Purpose data sparse (1–2 relevant tags found, inconsistently positioned)

**Example:** User selects "hike" but only 1 `natural=peak` found, 8km from the centroid.

**Score behavior:** `purposeFitScore = 20` (low, not null). Flag as `purposeAccessLevel: "limited"`.

**Output behavior:**
```
purposeAccessNote: "Limited hiking infrastructure found nearby. The nearest tagged trailhead is ~8km from the recommended base — verify transport options."
```

---

### Daily-life data sparse (no grocery or pharmacy found)

**Example:** Small surf town with no tagged supermarkets or pharmacies in the OSM radius.

**Score behavior:** `groceryScore = 0`, `pharmacyScore = 0`. These genuinely pull the daily-life score down — this is real data, not a gap.

**Output behavior:**
```
dailyLifeRedFlag: "No grocery store or pharmacy found near the recommended base. Daily-life logistics will require planning — likely a short scooter ride."
```

This is a **trust-building signal**, not a failure mode. Honest friction warnings are what make TrustStay credible for 2–8 week stays.

---

## 6. New data source: daily-life essentials

### Why a separate fetch

The existing `fetchPlaces` returns places shown as cards in the UI (cafés, coworkings, gyms, restaurants). Daily-life essentials (supermarkets, pharmacies, convenience stores, laundry) are **scoring signals only** — they do not appear in the place card UI but directly affect the daily-life fit score and red flags.

Keeping them separate avoids polluting the place card pipeline with venues that have no card display value.

### New Overpass query

```typescript
// src/lib/overpass.ts — new export

export type DailyLifePlaceType =
  | "grocery" | "convenience" | "pharmacy" | "laundry";

export interface DailyLifePlace {
  id: string;
  type: DailyLifePlaceType;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
}

async function _fetchDailyLifePlaces(city: City): Promise<DailyLifePlace[]> {
  const bbox = city.bbox
    ? `${city.bbox[0]},${city.bbox[1]},${city.bbox[2]},${city.bbox[3]}`
    : buildBbox(city.lat, city.lon);

  const query = `
[out:json][timeout:15][maxsize:500000];
(
  node["shop"="supermarket"](${bbox});
  node["shop"="grocery"](${bbox});
  node["shop"="convenience"](${bbox});
  node["amenity"="pharmacy"](${bbox});
  node["shop"="pharmacy"](${bbox});
  node["shop"="laundry"](${bbox});
  node["amenity"="laundry"](${bbox});
);
out center;
`.trim();

  // Same endpoint fallback pattern as fetchPlaces
  // Returns DailyLifePlace[] — no confidence scoring needed, pure presence signals
}

export const fetchDailyLifePlaces = unstable_cache(
  _fetchDailyLifePlaces,
  ["overpass-daily-life"],
  { revalidate: 86400 } // 24h — essentials change less often than cafés
);
```

---

## 7. The daily-life fit score

```typescript
function computeDailyLifeScore(
  places: Place[],           // existing place data (food + café for food sustainability)
  dailyLife: DailyLifePlace[], // new essential places
  centroid: { lat: number; lon: number }
): {
  score: number;             // 0–100
  breakdown: {
    foodSustainability: number;   // restaurants + food cafés within walking distance
    groceryAccess: number;        // supermarket / grocery proximity
    pharmacyAccess: number;       // pharmacy proximity
    essentialFriction: number;    // inverse of average distance to essentials
  };
  redFlags: string[];
} {
  const THRESHOLDS = {
    foodSustainability: 12,    // reasonable food density
    grocery: 2,                // 2 grocery options nearby = good
    pharmacy: 1,               // 1 pharmacy nearby = sufficient
    frictionKm: 1.5,           // essentials within 1.5km = low friction
  };

  // Food sustainability: restaurants + cafés with food within 1.5km of centroid
  const foodNearby = places.filter(
    p => (p.category === "food" || p.category === "cafe")
      && (p.distanceFromBasekm ?? p.distanceKm ?? 99) < 1.5
  );
  const foodScore = cappedRatio(foodNearby.length, THRESHOLDS.foodSustainability) * 100;

  // Grocery access: supermarkets + convenience stores within 1.5km
  const groceryNearby = dailyLife.filter(
    d => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 1.5
  );
  const groceryScore = cappedRatio(groceryNearby.length, THRESHOLDS.grocery) * 100;

  // Pharmacy: any pharmacy within 2km
  const pharmacyNearby = dailyLife.filter(d => d.type === "pharmacy" && d.distanceKm < 2.0);
  const pharmacyScore = Math.min(pharmacyNearby.length / THRESHOLDS.pharmacy, 1.0) * 100;

  // Essential friction: average distance to nearest grocery + pharmacy
  const nearestGrocery = groceryNearby[0]?.distanceKm ?? null;
  const nearestPharmacy = pharmacyNearby[0]?.distanceKm ?? null;
  const frictionDistances = [nearestGrocery, nearestPharmacy].filter(Boolean) as number[];
  const avgFrictionKm = frictionDistances.length
    ? frictionDistances.reduce((a, b) => a + b, 0) / frictionDistances.length
    : 5.0; // unknown = assume worst case
  const frictionScore = Math.max(0, (1 - avgFrictionKm / 3.0)) * 100;

  const score = Math.round(
    foodScore * 0.40 +
    groceryScore * 0.30 +
    pharmacyScore * 0.20 +
    frictionScore * 0.10
  );

  // Red flags
  const redFlags: string[] = [];
  if (groceryNearby.length === 0) {
    redFlags.push("No grocery store found near the base — daily shopping will require transport.");
  }
  if (pharmacyNearby.length === 0) {
    redFlags.push("No pharmacy found within 2km — factor this in for a stay longer than a week.");
  }
  if (foodNearby.length < 3) {
    redFlags.push("Limited food options near the recommended base — meal variety may require planning.");
  }

  return {
    score,
    breakdown: {
      foodSustainability: Math.round(foodScore),
      groceryAccess: Math.round(groceryScore),
      pharmacyAccess: Math.round(pharmacyScore),
      essentialFriction: Math.round(frictionScore),
    },
    redFlags,
  };
}
```

---

## 8. Output contract

The full typed output from `computeStayFitScore`. This is the contract between the scoring engine and the UI/LLM layer.

```typescript
export interface StayFitResult {

  // ── Core recommendation ──────────────────────────────────────────────────
  profile: FitProfile;
  baseArea: string;               // reverse-geocoded neighborhood name or "Central {city}"
  fitScore: number;               // 0–100, personalized
  fitLabel: "Strong" | "Moderate" | "Limited" | "Unknown";

  // ── Score breakdown (internal — drives narrative, not all shown in UI) ───
  scoreBreakdown: {
    workFit: number;              // 0–100
    purposeFit: number | null;    // null = unknown
    dailyLifeFit: number;         // 0–100
    dailyLifeDetail: {
      foodSustainability: number;
      groceryAccess: number;
      pharmacyAccess: number;
      essentialFriction: number;
    };
  };

  // ── Purpose access ───────────────────────────────────────────────────────
  purposeAccessLevel: "strong" | "moderate" | "limited" | "unknown";
  purposeAccessNote: string | null;  // honest signal, null if not applicable

  // ── Deterministic red flags ──────────────────────────────────────────────
  redFlags: string[];            // plain English, all deterministic — no LLM

  // ── Highlighted places (for UI + map) ───────────────────────────────────
  topWorkPlaces: Array<{
    id: string;
    name: string;
    category: PlaceCategory;
    wifiConfidence: string;
    noiseRisk: string;
    distanceFromBasekm: number | null;
    lat: number;
    lon: number;
  }>;

  topDailyLifePlaces: Array<{
    type: DailyLifePlaceType;
    name: string;
    distanceKm: number;
    lat: number;
    lon: number;
  }>;

  purposePlaces: Array<{
    name: string;
    osmType: string;           // e.g. "amenity=dive_shop"
    distanceKm: number;
    lat: number;
    lon: number;
  }> | null;                   // null if purpose data unknown

  // ── Map data ─────────────────────────────────────────────────────────────
  mapData: {
    centroid: { lat: number; lon: number };
    zoneRadiusKm: number;      // recommended search zone (typically 0.8–1.2km)
    pins: Array<{
      lat: number;
      lon: number;
      label: string;
      pinType: "work" | "purpose" | "food" | "essential" | "base";
    }>;
  };

  // ── Narrative inputs (for LLM grounding) ────────────────────────────────
  narrativeInputs: {
    profile: FitProfile;
    purpose: StayPurpose;
    workStyle: WorkStyle;
    vibe: VibePreference;
    baseAreaName: string;
    workInfrastructureSummary: string;  // e.g. "2 coworkings + 6 work-fit cafés"
    dailyLifeSummary: string;           // e.g. "1 supermarket within 800m, pharmacy 1.2km"
    purposeAccessSummary: string | null;
    primaryTradeoff: string | null;     // deterministic if data supports it
    activeRedFlags: string[];
    topWorkPlaceNames: string[];        // LLM may reference these by name
    clusterTightnessKm: number;         // std dev of top work places from centroid
  };

  // ── Confidence ───────────────────────────────────────────────────────────
  confidence: "high" | "medium" | "low";
  dataGaps: string[];          // honest list of what we couldn't verify
}
```

**Map layer note:** The `mapData` field provides everything the map component needs to render the trust layer — a highlighted base zone, categorized pins for work/purpose/food/essentials, and no AI involvement. The map is always deterministic and always grounded in real place coordinates.

---

## 9. Minimum code change plan

### Step 1: New types + daily-life fetch (2–3 hours)

**Files touched:** `src/types/index.ts`, `src/lib/overpass.ts`

- Add `StayPurpose`, `WorkStyle`, `VibePreference`, `StayIntent`, `FitProfile`, `DailyLifePlace`, `DailyLifePlaceType` to types
- Add `fetchDailyLifePlaces(city)` to `overpass.ts` with the new Overpass query
- No changes to existing functions

**Verification:** Call `fetchDailyLifePlaces` with Puerto Escondido, Lisbon, and a small surf town. Confirm it returns grocery/pharmacy data for larger cities and an honest empty array for small towns.

---

### Step 2: Scoring engine (3–4 hours)

**Files touched:** `src/lib/scoring.ts`

- Add `PROFILE_CONFIGS` and `resolveProfile(intent)` 
- Add `computeWorkFitScore(places, subWeights)` — extracts and re-weights the work dimension
- Add `computeDailyLifeScore(places, dailyLife, centroid)` — new function
- Add `computePurposeAccessScore(dailyLife, purpose, centroid)` — lightweight, honest, returns null when unknown
- Add `computeStayFitScore(places, dailyLife, city, intent, areaName?)` — the orchestrating function that calls the above and returns `StayFitResult`

**No changes to `computeCitySummary` or `computeBaseCentroid`.**

**Verification:** Call `computeStayFitScore` with the same city + 4 different intents. Confirm the `fitScore` and `scoreBreakdown` differ meaningfully. Specifically: a `work_primary` profile must score higher on `workFit` than an `activity_light_work` profile in a city with coworkings.

---

### Step 3: Wire into city page (1–2 hours)

**Files touched:** `src/app/city/[slug]/page.tsx`

- Accept `intent` from URL search params (`?purpose=surf&workStyle=light&vibe=social`) — this is sufficient for v1 before the UI input module is built
- Call `fetchDailyLifePlaces` in the existing `Promise.all` alongside `fetchPlaces`
- After places are resolved, call `computeStayFitScore` if intent is present; fall back to `computeCitySummary` if not
- Pass `StayFitResult` alongside existing `CitySummary` to the relevant display components

**Verification:** Load `/city/puerto-escondido?purpose=surf&workStyle=light` and `/city/puerto-escondido?purpose=work_first&workStyle=heavy`. Confirm different scores, different red flags, different narrativeInputs appear in the page props. The UI doesn't need to show them yet — just confirm the data shape is correct.

This is the minimum end-to-end milestone. Backend works. Data flows. The UI can catch up in a separate pass.

---

## 10. Test plan

### Profile differentiation test

**Cities:** Puerto Escondido (surf, thin work infrastructure), Lisbon (dense work infrastructure, no surf), Medellin (balanced)

**For each city, run all 4 profiles and assert:**
- `fitScore` differs by at least 10 points between `activity_light_work` and `work_primary`
- `redFlags` are different between profiles (or at minimum not identical)
- `topWorkPlaces` differs in ordering between `work_primary` (coworkings first) and `activity_light_work` (cafés first)
- `scoreBreakdown.workFit` is higher for `work_primary` in cities with coworkings

**Anti-fake-branching check:** If two profiles return the same `fitScore` and same `redFlags` and same `topWorkPlaces`, the branching has collapsed. Flag this as a test failure.

---

### Purpose data unknown test

**City:** A small surf town with no tagged dive shops

**Input:** `{ purpose: "dive", workStyle: "light" }`

**Assert:**
- `purposeAccessLevel === "unknown"`
- `purposeFit === null` in scoreBreakdown
- `purposeAccessNote` is a plain English warning string
- `purposePlaces === null`
- `fitScore` does not return 0 — weight redistributed to work + daily-life
- `dataGaps` includes a mention of dive infrastructure

---

### Daily-life sparse test

**City:** Small village with no OSM-tagged grocery or pharmacy

**Assert:**
- `dailyLifeDetail.groceryAccess === 0`
- `dailyLifeDetail.pharmacyAccess === 0`
- `dailyLifeFit` is low (not suppressed or normalized)
- `redFlags` includes the grocery warning
- `topDailyLifePlaces` is empty or very short

---

### Known good city baseline test

**City:** Lisbon (`work_primary` profile)

**Assert:**
- `workFit > 70`
- `dailyLifeFit > 60`
- `redFlags` is empty or minimal
- `topWorkPlaces.length >= 3`
- `confidence === "high"`

---

### Example test case table

| City | Profile | Expected fitScore range | Expected red flags |
|---|---|---|---|
| Puerto Escondido | activity_light_work | 55–75 | Possibly wifi unknown |
| Puerto Escondido | work_primary | 30–55 | No coworking warning |
| Lisbon | work_primary | 70–85 | None or minimal |
| Lisbon | activity_light_work | 45–65 | No surf access |
| Medellin (El Poblado) | activity_balanced_work | 60–75 | Check purpose data |
| Small surf village | any | 20–45 | Daily-life friction |

---

## 11. Risks

### Profile collapse into similar outputs

**Risk:** Two profiles produce the same score because the data for a city doesn't actually support differentiation. A city with 0 coworkings scores the same for `activity_light_work` and `work_primary` on work fit because the base level is already 0.

**Mitigation:** The score may converge, but the red flags will differ. `work_primary` always gets a coworking red flag when there are none. `activity_light_work` does not. This is enough to maintain meaningful branching even when scores are similar.

---

### Daily-life data thin across the board

**Risk:** OSM coverage of supermarkets, pharmacies, and laundry is inconsistent especially in smaller towns and developing regions. Many cities in TrustStay's coverage will return empty daily-life datasets.

**Mitigation:** Low daily-life score is treated as a honest signal, not a failure. Cities with thin OSM coverage should have low daily-life scores — that is probably accurate. The system is honest about what it doesn't know. `dataGaps` and `purposeAccessNote` carry the honest message.

---

### Overpass rate pressure from two parallel queries

**Risk:** Adding `fetchDailyLifePlaces` alongside `fetchPlaces` doubles the Overpass requests per city page load.

**Mitigation:** Both fetches are cached — `fetchPlaces` at 1h, `fetchDailyLifePlaces` at 24h (essentials change slowly). The actual performance impact is only on cache misses. With KV caching from the place cache work already done, this is manageable. Run both in parallel, not in sequence.

---

### Score instability from small place counts

**Risk:** A city with 2 cafés and 1 coworking shows wildly different scores across profiles because the numbers are small enough to be sensitive to individual place weights.

**Mitigation:** The `cappedRatio` approach from the existing scoring already handles this by capping the ratio at `SCORE_CERTAINTY_CAP = 0.85`. Thin cities naturally score lower and more conservatively. The confidence field (`"low"`) signals this to the UI.

---

## 12. Final recommendation

### Leanest implementation path

Three steps, no big refactor:

1. **New types + `fetchDailyLifePlaces`** — purely additive, zero risk to existing code
2. **`computeStayFitScore` in `scoring.ts`** — new function alongside existing ones, no existing functions modified
3. **Intent from URL params in city page** — feature-flag compatible, existing behavior unaffected when no intent param is present

### First file to modify

`src/types/index.ts` — add the new types first. Everything else depends on them.

### Minimum end-to-end milestone

A successful test looks like this:

```
/city/puerto-escondido?purpose=surf&workStyle=light
→ fitScore: 62, fitLabel: "Moderate"
→ topWorkPlaces: [Café A, Café B, Café C]  (cafés first, no coworking)
→ redFlags: []

/city/puerto-escondido?purpose=work_first&workStyle=heavy
→ fitScore: 38, fitLabel: "Limited"
→ topWorkPlaces: [] coworkings, [Café A, Café B] (wifi warning)
→ redFlags: ["No dedicated coworking found — you'll depend entirely on cafés."]
```

Same city. Same underlying OSM data. Meaningfully different outputs. That is the proof the engine works.

### The principle we must protect

**Every number in the score must change for a real reason, not a cosmetic one.**

If the `fitScore` for `work_primary` vs `activity_light_work` is 38 vs 62, it is because coworkings got a 5× weight boost and there are no coworkings in Puerto Escondido — a real, verifiable fact. Not because we applied a random modifier to make the numbers look different.

The engine's credibility is entirely tied to this. Build scoring transparency in from the start: every score should be reconstructible from `scoreBreakdown`, and every red flag should be traceable to a data condition, not an AI decision.
