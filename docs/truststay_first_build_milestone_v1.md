# TrustStay — First Build Milestone v1

**Status:** Ready to implement  
**Scope:** Backend only — no frontend redesign, no LLM, no chat  
**Estimated effort:** 1 focused day  

---

## 1. Milestone goal

Prove that TrustStay can produce a **meaningfully different, honest output** from the same city data, depending on what the user tells us about their stay.

Specifically: by the end of this milestone, calling `/city/puerto-escondido?purpose=surf&workStyle=light` vs `/city/puerto-escondido?purpose=work_first&workStyle=heavy` must return a different `fitScore`, different `redFlags`, and different place ordering — all from real data, no AI.

Secondary goal: **improve the generic output immediately**, even for users who provide no intent. The current generic summary ignores daily-life fit entirely. After this milestone, every city page has honest grocery and pharmacy signals built in.

This is not a UI release. It is a backend data contract milestone that the UI and LLM layers will build on top of.

---

## 2. Scope

### Included

- New `fetchDailyLifePlaces(city)` function — groceries, pharmacies, convenience stores
- New `StayIntent`, `StayFitResult`, `DailyLifePlace` types
- New `computeStayFitScore(places, dailyLife, city, intent, areaName?)` function
- Improved `computeCitySummary` that appends daily-life gap signals to `summaryText` and `areaReason`
- Red flag logic — deterministic, plain English, rule-based
- City page wiring: call new functions when URL params `?purpose=` and `?workStyle=` are present; fall back to existing behavior when not
- KV cache extension: `fetchDailyLifePlaces` output cached alongside places

### Excluded

- Frontend input UI ("Shape this stay" chip module) — second milestone
- LLM narrative generation — third milestone
- Purpose-specific OSM queries (dive shops, trailheads, surf beaches) — second milestone
- Profile-specific centroid re-weighting — second milestone
- Persistent user profile (localStorage) — second milestone
- Any changes to place card display — no changes

---

## 3. First code changes — file by file

### File 1: `src/types/index.ts`

**Add** (no modifications to existing types):

```typescript
// ── Stay intent types ────────────────────────────────────────────────────────

export type StayPurpose =
  | "surf" | "dive" | "hike" | "yoga" | "kite"
  | "work_first" | "exploring";

export type WorkStyle = "light" | "balanced" | "heavy";

export type VibePreference = "social" | "local" | "quiet" | null;

export interface StayIntent {
  purpose: StayPurpose;
  workStyle: WorkStyle;
  vibe?: VibePreference;
}

export type FitProfile =
  | "activity_light_work"
  | "activity_balanced_work"
  | "work_primary"
  | "generic";

// ── Daily-life essentials ────────────────────────────────────────────────────

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

// ── Stay fit result ──────────────────────────────────────────────────────────

export interface StayFitResult {
  profile: FitProfile;
  baseArea: string;
  fitScore: number;                       // 0–100, personalized
  fitLabel: "Strong" | "Moderate" | "Limited" | "Unknown";
  confidence: "high" | "medium" | "low";

  scoreBreakdown: {
    workFit: number;                      // 0–100
    purposeFit: number | null;            // null = unknown, not 0
    dailyLifeFit: number;                 // 0–100
    dailyLifeDetail: {
      foodSustainability: number;
      groceryAccess: number;
      pharmacyAccess: number;
    };
  };

  purposeAccessLevel: "strong" | "moderate" | "limited" | "unknown";
  purposeAccessNote: string | null;

  redFlags: string[];                     // deterministic only — no LLM
  dataGaps: string[];                     // what we couldn't verify

  topWorkPlaces: Array<{
    id: string;
    name: string;
    category: PlaceCategory;
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

  // Inputs for the LLM layer (milestone 3) — populated now, used later
  narrativeInputs: {
    profile: FitProfile;
    purpose: StayPurpose;
    workStyle: WorkStyle;
    baseAreaName: string;
    workInfrastructureSummary: string;
    dailyLifeSummary: string;
    purposeAccessSummary: string | null;
    activeRedFlags: string[];
    topWorkPlaceNames: string[];
  };
}
```

---

### File 2: `src/lib/overpass.ts`

**Add** `fetchDailyLifePlaces` — new export, no changes to existing functions.

```typescript
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

  // Same multi-endpoint fallback pattern as _fetchPlaces
  let res: Response | undefined;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const attempt = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        next: { revalidate: 86400 },     // 24h — essentials change slowly
        signal: AbortSignal.timeout(20000),
      });
      if (attempt.ok) { res = attempt; break; }
    } catch { /* try next */ }
  }

  if (!res) return [];

  let json: { elements: OverpassElement[] };
  try { json = await res.json(); }
  catch { return []; }

  const places: DailyLifePlace[] = [];
  const seen = new Set<string>();

  for (const el of json.elements) {
    const coords = getCoords(el);
    if (!coords) continue;

    const type = classifyDailyLifeType(el.tags);
    if (!type) continue;

    const name = el.tags.name ?? el.tags["name:en"] ?? type;
    const key = `${type}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distanceKm =
      Math.round(haversineKm(city.lat, city.lon, coords.lat, coords.lon) * 10) / 10;

    places.push({
      id: `osm-${el.type}-${el.id}`,
      type,
      name: name.trim(),
      lat: coords.lat,
      lon: coords.lon,
      distanceKm,
    });
  }

  return places;
}

function classifyDailyLifeType(
  tags: Record<string, string>
): DailyLifePlaceType | null {
  const shop = tags.shop ?? "";
  const amenity = tags.amenity ?? "";
  if (shop === "supermarket" || shop === "grocery") return "grocery";
  if (shop === "convenience") return "convenience";
  if (amenity === "pharmacy" || shop === "pharmacy") return "pharmacy";
  if (shop === "laundry" || amenity === "laundry") return "laundry";
  return null;
}

export const fetchDailyLifePlaces = unstable_cache(
  _fetchDailyLifePlaces,
  ["overpass-daily-life"],
  { revalidate: 86400 }
);
```

---

### File 3: `src/lib/scoring.ts`

**Keep `computeCitySummary` and `computeBaseCentroid` exactly as they are.**

**Add** four new exports at the bottom of the file:

1. `resolveProfile(intent)` — maps intent to profile
2. `computeWorkFitScore(places, profile)` — re-weighted work score
3. `computeDailyLifeScore(places, dailyLife)` — new, uses new data
4. `computeStayFitScore(places, dailyLife, city, intent, areaName?)` — orchestrates

Detailed signatures and logic are in section 5 below.

---

### File 4: `src/lib/placesCache.ts`

**Extend** `getPlacesWithCache` to also cache daily-life places.

Option A (simplest): add a separate `getDailyLifeWithCache(city)` function following the same KV pattern as `getPlacesWithCache`. Same structure — check KV first, fall back to Overpass, save to KV on miss.

KV key: `city-daily-life:{slug}`, TTL: 14 days (same as places, essentials are stable).

Option B: extend `CachedPlaces` in `kv.ts` to include `dailyLifePlaces`. Cleaner long-term but requires a type migration.

**Recommendation:** Option A for this milestone. One new function, no type migration, immediately testable.

---

### File 5: `src/app/city/[slug]/page.tsx`

**Add** to the existing `Promise.all` call that fetches places and narrative:

```typescript
const [city, unlocked, kvNarrative, { places: allPlaces, ... }, dailyLifePlaces] =
  await Promise.all([
    resolveCity(slug, sp),
    isUnlocked(slug, parentCitySlug),
    getNarrative(slug).catch(() => null),
    getPlacesWithCache(city),      // existing
    getDailyLifeWithCache(city),   // new
  ]);
```

**Add** intent resolution from URL params:

```typescript
// Intent from URL params — UI input module will write these in milestone 2
function parseIntent(sp: SearchParams): StayIntent | null {
  const purpose = getString(sp, "purpose") as StayPurpose | undefined;
  const workStyle = getString(sp, "workStyle") as WorkStyle | undefined;
  const vibe = (getString(sp, "vibe") ?? null) as VibePreference;

  const validPurposes: StayPurpose[] = [
    "surf", "dive", "hike", "yoga", "kite", "work_first", "exploring"
  ];
  const validWorkStyles: WorkStyle[] = ["light", "balanced", "heavy"];

  if (!purpose || !validPurposes.includes(purpose)) return null;
  if (!workStyle || !validWorkStyles.includes(workStyle)) return null;

  return { purpose, workStyle, vibe };
}
```

**Add** score computation after places resolve:

```typescript
const intent = parseIntent(sp);

// Always compute generic summary (existing behavior, unchanged)
const summary = computeCitySummary(city, enrichedPlaces, baseCentroidAddress);

// Compute personalized fit score when intent is present
const stayFit = intent
  ? computeStayFitScore(enrichedPlaces, dailyLifePlaces, city, intent, baseCentroidAddress)
  : null;
```

Pass `stayFit` down to components. For this milestone, components can log or no-op on `stayFit` — display changes come in milestone 2.

---

## 4. New data to fetch

**Daily-life essentials — v1 query:**

| OSM tag | Maps to | Why |
|---|---|---|
| `shop=supermarket` | `grocery` | Primary weekly shopping |
| `shop=grocery` | `grocery` | Local produce shops |
| `shop=convenience` | `convenience` | Daily top-ups, snacks |
| `amenity=pharmacy` + `shop=pharmacy` | `pharmacy` | Health essentials |
| `shop=laundry` + `amenity=laundry` | `laundry` | 2–8 week stays |

**What we intentionally exclude from v1:**
- `amenity=bank` / `amenity=atm` — too many false positives in small towns
- `amenity=hospital` — too coarse for daily-life signal
- `shop=bakery` / `shop=butcher` — too granular, captures with food places already

**Spatial constraint:** All daily-life places are fetched within the same bounding box as `fetchPlaces` (city center ± 0.05° ≈ 5km radius). No change to bbox logic.

---

## 5. New scoring logic

### `resolveProfile(intent: StayIntent): FitProfile`

```
purpose is activity (surf/dive/hike/yoga/kite):
  workStyle = "light"     → "activity_light_work"
  workStyle = "balanced"
    or "heavy"            → "activity_balanced_work"

purpose = "work_first"    → "work_primary"
purpose = "exploring"
  or intent is null       → "generic"
```

---

### `computeWorkFitScore(places, profile): number` — returns 0–100

The existing routine score gives 25 points each to cafés, coworkings, gyms, and food. This function re-weights only the **work-relevant** categories (cafés and coworkings) per profile. Gyms and food are excluded — they belong to daily-life fit.

**Weight vectors:**

```
activity_light_work:
  coworking:           10%   (minimum — one is plenty)
  high-workFit café:   55%   (primary work option)
  wifi verified:       20%   (useful, not critical)
  noise low:           15%   (soft signal)

activity_balanced_work:
  coworking:           35%   (important but not sole option)
  high-workFit café:   35%   (co-equal)
  wifi verified:       20%
  noise low:           10%

work_primary:
  coworking:           50%   (primary expectation)
  high-workFit café:   25%   (backup)
  wifi verified:       15%
  noise low:           10%

generic:
  Equal weight across coworkings and cafés — closest to current behavior
```

**Derivation from existing place data:**

```typescript
function computeWorkFitScore(places: Place[], profile: FitProfile): number {
  const coworkings = places.filter(p => p.category === "coworking");
  const highWorkFitCafes = places.filter(
    p => p.category === "cafe" && p.confidence.workFit === "high"
  );
  const wifiVerified = places.filter(
    p => (p.category === "cafe" || p.category === "coworking")
      && p.confidence.wifiConfidence === "verified"
  );
  const lowNoise = places.filter(
    p => (p.category === "cafe" || p.category === "coworking")
      && p.confidence.noiseRisk === "low"
  );

  const w = WORK_SUBWEIGHTS[profile];

  const score =
    cappedRatio(coworkings.length, 4)       * w.coworking    * 100 +
    cappedRatio(highWorkFitCafes.length, 8) * w.highWorkFitCafe * 100 +
    cappedRatio(wifiVerified.length, 5)     * w.wifiConfidence * 100 +
    cappedRatio(lowNoise.length, 5)         * w.noiseRisk    * 100;

  return Math.round(Math.min(score, 95)); // cap at 95 — same honesty principle
}
```

---

### `computeDailyLifeScore(places, dailyLife): { score, breakdown, redFlags }` — returns 0–100

```typescript
function computeDailyLifeScore(places: Place[], dailyLife: DailyLifePlace[]) {
  // Food sustainability: restaurants + cafés with food near city center
  const foodNearby = places.filter(
    p => (p.category === "food" || p.category === "cafe")
      && (p.distanceKm ?? 99) < 1.5
  );
  const foodScore = cappedRatio(foodNearby.length, 12) * 100;

  // Grocery: supermarkets + convenience within 1.5km
  const groceryNearby = dailyLife.filter(
    d => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 1.5
  );
  const groceryScore = cappedRatio(groceryNearby.length, 2) * 100;

  // Pharmacy: any within 2km
  const pharmacyNearby = dailyLife.filter(d => d.type === "pharmacy" && d.distanceKm < 2.0);
  const pharmacyScore = Math.min(pharmacyNearby.length, 1) * 100; // 1 = enough

  // Weighted total
  const score = Math.round(
    foodScore    * 0.45 +
    groceryScore * 0.35 +
    pharmacyScore * 0.20
  );

  // Deterministic red flags
  const redFlags: string[] = [];
  if (groceryNearby.length === 0) {
    redFlags.push(
      "No grocery store found near the recommended base — daily shopping will require transport."
    );
  }
  if (pharmacyNearby.length === 0) {
    redFlags.push(
      "No pharmacy found within 2km — worth factoring in for stays longer than a week."
    );
  }
  if (foodNearby.length < 3) {
    redFlags.push(
      "Limited food options near the recommended base — meal variety will require planning."
    );
  }
  if (groceryNearby.length === 0 && pharmacyNearby.length === 0) {
    redFlags.push(
      "Daily-life logistics here likely require a scooter or regular transport."
    );
  }

  return {
    score,
    breakdown: {
      foodSustainability: Math.round(foodScore),
      groceryAccess: Math.round(groceryScore),
      pharmacyAccess: Math.round(pharmacyScore),
    },
    redFlags,
  };
}
```

---

### `computeStayFitScore` — orchestrator

```typescript
export function computeStayFitScore(
  places: Place[],
  dailyLife: DailyLifePlace[],
  city: { name: string; lat: number; lon: number },
  intent: StayIntent,
  areaName?: string
): StayFitResult {
  const profile = resolveProfile(intent);
  const config = PROFILE_CONFIGS[profile];

  // Component scores
  const workFit = computeWorkFitScore(places, profile);
  const { score: dailyLifeFit, breakdown: dailyLifeDetail, redFlags: lifeFlags } =
    computeDailyLifeScore(places, dailyLife);

  // Purpose fit: milestone 1 — always null (OSM activity query comes in milestone 2)
  const purposeFit: number | null = null;
  const purposeAccessLevel = "unknown" as const;
  const purposeAccessNote = intent.purpose !== "work_first" && intent.purpose !== "exploring"
    ? `We don't yet have ${intent.purpose} infrastructure data for this place — verify locally.`
    : null;

  // Total fit score
  // When purposeFit is null, redistribute purpose weight to work + life proportionally
  const effectiveWorkWeight = purposeFit === null
    ? config.weights.work + config.weights.purpose * 0.5
    : config.weights.work;
  const effectiveLifeWeight = purposeFit === null
    ? config.weights.dailyLife + config.weights.purpose * 0.5
    : config.weights.dailyLife;

  const fitScore = Math.round(
    workFit * effectiveWorkWeight +
    dailyLifeFit * effectiveLifeWeight
  );

  // Work-specific red flags (deterministic)
  const workFlags: string[] = [];
  const coworkings = places.filter(p => p.category === "coworking");
  const allWorkPlaces = places.filter(
    p => p.category === "coworking" || p.category === "cafe"
  );
  const wifiVerified = allWorkPlaces.filter(
    p => p.confidence.wifiConfidence === "verified"
  );

  if (profile === "work_primary" && coworkings.length === 0) {
    workFlags.push(
      "No dedicated coworking found — you'll depend entirely on cafés for focused work sessions."
    );
  }
  if (
    (profile === "work_primary" || profile === "activity_balanced_work")
    && wifiVerified.length === 0
    && allWorkPlaces.length > 0
  ) {
    workFlags.push(
      "No verified wifi found across available work spots — confirm connection quality before committing."
    );
  }

  const redFlags = [...workFlags, ...lifeFlags];

  // Top work places ordered by profile weight (coworkings first for work_primary)
  const topWorkPlaces = [...places]
    .filter(p => p.category === "coworking" || p.category === "cafe")
    .sort((a, b) => {
      if (profile === "work_primary" || profile === "activity_balanced_work") {
        // Coworkings first, then high-workFit cafés
        const aScore = a.category === "coworking" ? 10 :
          a.confidence.workFit === "high" ? 5 : 1;
        const bScore = b.category === "coworking" ? 10 :
          b.confidence.workFit === "high" ? 5 : 1;
        if (aScore !== bScore) return bScore - aScore;
      }
      // Then by distance from base
      return (a.distanceFromBasekm ?? a.distanceKm ?? 99) -
             (b.distanceFromBasekm ?? b.distanceKm ?? 99);
    })
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      distanceFromBasekm: p.distanceFromBasekm ?? null,
      lat: p.lat,
      lon: p.lon,
    }));

  // Top daily-life places for map + display
  const topDailyLifePlaces = dailyLife
    .filter(d => d.type === "grocery" || d.type === "pharmacy")
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4)
    .map(d => ({
      type: d.type,
      name: d.name,
      distanceKm: d.distanceKm,
      lat: d.lat,
      lon: d.lon,
    }));

  // Base area label
  const baseArea = areaName?.trim() || `Central ${city.name}`;

  // Confidence
  const dataGaps: string[] = [];
  if (places.length < 5) dataGaps.push("Very few places found — coverage is limited for this area.");
  if (dailyLife.length === 0) dataGaps.push("Daily-life infrastructure data not available from OpenStreetMap.");
  if (purposeAccessNote) dataGaps.push(purposeAccessNote);

  const confidence: StayFitResult["confidence"] =
    fitScore >= 60 && redFlags.length === 0 ? "high" :
    fitScore >= 35 ? "medium" : "low";

  const fitLabel: StayFitResult["fitLabel"] =
    fitScore >= 65 ? "Strong" :
    fitScore >= 40 ? "Moderate" :
    fitScore >= 20 ? "Limited" : "Unknown";

  // Narrative inputs — populated now, used by LLM in milestone 3
  const coworkingCount = coworkings.length;
  const cafesWithWork = places.filter(
    p => p.category === "cafe" && (p.confidence.workFit === "high" || p.confidence.workFit === "medium")
  ).length;
  const groceryCount = dailyLife.filter(d => d.type === "grocery" || d.type === "convenience").length;
  const pharmacyCount = dailyLife.filter(d => d.type === "pharmacy").length;

  const narrativeInputs = {
    profile,
    purpose: intent.purpose,
    workStyle: intent.workStyle,
    baseAreaName: baseArea,
    workInfrastructureSummary:
      coworkingCount > 0
        ? `${coworkingCount} coworking${coworkingCount > 1 ? "s" : ""} + ${cafesWithWork} work-capable café${cafesWithWork !== 1 ? "s" : ""}`
        : `${cafesWithWork} work-capable café${cafesWithWork !== 1 ? "s" : ""}, no coworking`,
    dailyLifeSummary:
      groceryCount > 0 || pharmacyCount > 0
        ? [
            groceryCount > 0 ? `${groceryCount} grocery option${groceryCount > 1 ? "s" : ""} within 1.5km` : null,
            pharmacyCount > 0 ? `pharmacy within ${dailyLife.find(d => d.type === "pharmacy")?.distanceKm ?? "?"}km` : null,
          ].filter(Boolean).join(", ")
        : "No grocery or pharmacy found near the base",
    purposeAccessSummary: null,       // populated in milestone 2
    activeRedFlags: redFlags,
    topWorkPlaceNames: topWorkPlaces.map(p => p.name),
  };

  return {
    profile,
    baseArea,
    fitScore,
    fitLabel,
    confidence,
    scoreBreakdown: {
      workFit,
      purposeFit,
      dailyLifeFit,
      dailyLifeDetail,
    },
    purposeAccessLevel,
    purposeAccessNote,
    redFlags,
    dataGaps,
    topWorkPlaces,
    topDailyLifePlaces,
    narrativeInputs,
  };
}
```

---

## 6. `computeCitySummary` improvements

**Do not change the signature or logic of `computeCitySummary`.** It is the generic fallback and is correct.

**Add one small improvement:** when daily-life data is available, append a daily-life gap signal to `summaryText` so even generic (no-intent) users see honest friction warnings.

This is a separate helper, not a change to the existing function:

```typescript
export function appendDailyLifeSignals(
  summary: CitySummary,
  dailyLife: DailyLifePlace[]
): CitySummary {
  const groceryNearby = dailyLife.filter(
    d => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 2.0
  );
  const pharmacyNearby = dailyLife.filter(d => d.type === "pharmacy" && d.distanceKm < 2.5);

  const gaps: string[] = [];
  if (groceryNearby.length === 0) gaps.push("no grocery store within 2km");
  if (pharmacyNearby.length === 0) gaps.push("no pharmacy found nearby");

  if (gaps.length === 0) return summary; // nothing to add

  const signal = `Daily-life note: ${gaps.join(" and ")} — factor this into a longer stay.`;
  return {
    ...summary,
    summaryText: `${summary.summaryText} ${signal}`,
  };
}
```

Called in the city page after both `computeCitySummary` and `fetchDailyLifePlaces` resolve. Applies to all users, not just those with intent.

---

## 7. Red flag logic — complete list for milestone 1

All red flags are deterministic. No AI. Every flag maps to a data condition.

| Condition | Flag text | Profiles affected |
|---|---|---|
| 0 coworkings + profile is `work_primary` | "No dedicated coworking found — you'll depend entirely on cafés for focused work sessions." | work_primary |
| 0 verified wifi places + `work_primary` or `activity_balanced_work` | "No verified wifi found — confirm connection quality before committing." | work_primary, activity_balanced_work |
| 0 grocery/convenience within 1.5km | "No grocery store found near the recommended base — daily shopping will require transport." | all |
| 0 pharmacy within 2km | "No pharmacy found within 2km — worth factoring in for stays longer than a week." | all |
| < 3 food spots within 1.5km | "Limited food options near the recommended base — meal variety will require planning." | all |
| 0 grocery AND 0 pharmacy | "Daily-life logistics here likely require a scooter or regular transport." | all (replaces individual flags above when both missing) |
| total places < 5 | Surfaces in `dataGaps`, not `redFlags`: "Very few places found — coverage is limited for this area." | all |

**Rule: never show a red flag for a condition that doesn't actually exist in the data.** If a city has a pharmacy 1.8km from the center, no pharmacy flag is shown — even if it feels far. Honest data, not editorial anxiety.

---

## 8. Test cases

### City 1: Lisbon (strong coverage)

**What to verify:**
- `fetchDailyLifePlaces` returns multiple supermarkets, pharmacies
- `groceryScore > 80`, `pharmacyScore = 100`
- `dailyLifeFit > 70`
- `workFit` differs meaningfully between `work_primary` (coworkings elevated) vs `activity_light_work` (cafés elevated)
- `redFlags` is empty or minimal
- `topWorkPlaces` ordering: coworkings first for `work_primary`, high-workFit cafés first for `activity_light_work`

**Acceptable result range:**
- `work_primary` fitScore: 70–85
- `activity_light_work` fitScore: 55–70 (purposeFit is null — weight redistributed)

---

### City 2: Puerto Escondido (small surf town, mixed coverage)

**What to verify:**
- `fetchDailyLifePlaces` likely returns 0–1 grocery, 0–1 pharmacy
- `groceryScore < 50` or `= 0`
- Grocery or pharmacy red flag fires
- `workFit` is lower for `work_primary` (few coworkings) than for `activity_light_work` (some cafés)
- `activity_light_work` fitScore meaningfully higher than `work_primary` fitScore for this city
- `dailyLifeFit < 50` likely — reflects honest data, not a bug

**Key assertion:** `work_primary` must produce a grocery red flag AND a coworking red flag. `activity_light_work` must produce only the grocery red flag (if it fires). Different profiles → different red flag sets.

---

### City 3: Medellin / El Poblado (urban, medium coverage)

**What to verify:**
- `fetchDailyLifePlaces` returns grocery + pharmacy data
- `dailyLifeScore > 60`
- `work_primary` produces high `workFit` (El Poblado has coworkings)
- `activity_light_work` produces lower `workFit` (café-weighted) but similar `dailyLifeFit`
- Total `fitScore` gap between profiles is at least 10 points on `workFit` dimension

---

## 9. Success criteria

The milestone is complete when all of the following are true:

**1. Scores diverge by profile**  
Puerto Escondido with `work_primary` vs `activity_light_work` produces a `fitScore` difference of at least 10 points AND a different set of `redFlags`.

**2. Daily-life signals fire honestly**  
Puerto Escondido returns at least one grocery or pharmacy red flag. Lisbon returns none. Both outcomes reflect real OSM data, not editorial decisions.

**3. Generic output improves**  
A user visiting `/city/puerto-escondido` with no intent params sees `summaryText` that includes the grocery/pharmacy gap signal from `appendDailyLifeSignals` — even without providing any intent.

**4. No regressions**  
All existing city pages load correctly. `computeCitySummary` is unchanged. `fetchPlaces` is unchanged. The new functions are purely additive.

**5. Clean build**  
`npm run build` passes with no TypeScript errors.

**6. `narrativeInputs` is populated**  
`stayFit.narrativeInputs.workInfrastructureSummary` and `dailyLifeSummary` are non-empty strings that could be passed directly to a prompt. This proves the data contract for milestone 3 is in place.

---

## 10. What comes next

### Milestone 2: Intent input module + purpose OSM query

**Goal:** The user can set their stay intent from the city page UI, and purpose-specific infrastructure data is fetched.

**Scope:**
- "Shape this stay" chip input module (3 fields — purpose, work style, vibe)
- Stores intent in `localStorage` per city slug
- Updates the page in real time when intent changes (client-side re-fetch or server-side URL param update)
- Purpose OSM query: add `fetchPurposePlaces(city, purpose)` — queries dive shops, yoga studios, beach tags, trail markers per purpose
- `computePurposeAccessScore` becomes non-null — `purposeFit` can now have a real value
- Profile-weighted centroid recalculation (purpose bias modifier on `computeBaseCentroid`)

**Visible change:** The city page now shows a "Shape this stay" module above the place sections. Filling it in changes the stay fit score and red flags in real time.

### Milestone 3: LLM narrative layer

**Goal:** The `narrativeInputs` object built in milestone 1 is passed to the LLM. The LLM generates `whyThisFits`, `tradeoffs`, and `firstWeekRhythm` — all strictly grounded in real place data.

**Scope:**
- `generateStayNarrative(narrativeInputs)` function in `narrativeAI.ts`
- Uses existing admin-facing LLM infrastructure (OpenAI gpt-4o)
- LLM prompt explicitly constrains output to the place names and data in `narrativeInputs`
- Narrative is cached in KV alongside the existing city narrative
- Unlocked users see the full narrative; free users see `whyThisFits` (1 sentence)

**This is the milestone that produces the shareable magic — the recommendation that feels deeply right.**
