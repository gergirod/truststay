# Task 21 — LLM Runtime: AI-Powered City Narrative

## Objective
Replace the rule-based `computeCitySummary` text output with an LLM-generated
narrative that uses real place data as context. The LLM receives the scored places,
coordinates, and city metadata — and returns a natural-language summary, a named
base area recommendation, and a reason why. The numeric routine score stays
algorithmic (objective); the LLM only writes the narrative layer.

## Problem
- `computeCitySummary` today generates text from template strings and score buckets
  (e.g. "Solid work setup with reliable options") — it's generic, not specific
- The "Suggested base area" shows a reverse-geocoded neighborhood name but no explanation
  of WHY that area is the best base — users have to infer it
- The LLM knows city geography, neighborhood character, and what makes a place work
  for a remote worker — information OSM alone can't provide

## Must include

### A. LLM narrative generation function
New file: `src/lib/narrativeAI.ts`

Input (passed from `CityContent`):
```ts
interface NarrativeInput {
  cityName: string;
  citySlug: string;
  country: string;
  routineScore: number;           // computed algorithmically
  topWorkPlaces: { name: string; category: string; distanceFromBasekm?: number }[];
  topCafes: { name: string; distanceFromBasekm?: number }[];
  baseCentroidAddress: string | null; // from reverseGeocodeArea
  totalPlaces: number;
}
```

Output:
```ts
interface NarrativeOutput {
  summaryText: string;      // 1–2 sentences about the overall setup
  baseAreaName: string;     // neighborhood name (e.g. "La Punta")
  baseAreaReason: string;   // 1 sentence: why this area is the recommended base
}
```

Model: `gpt-4o-mini` (cheap, fast — typical call < 800ms, < $0.001)

### B. Prompt design
```
You are a data analyst for Truststay, a guide for remote workers choosing neighborhoods.

City: {cityName}, {country}
Routine score: {routineScore}/100 (algorithmically computed from place density and quality)
Total places found nearby: {totalPlaces}

Top work spots within walking distance:
{topWorkPlaces.map(p => `- ${p.name} (${p.category}, ${p.distanceFromBasekm}km)`).join('\n')}

Top cafés:
{topCafes.map(p => `- ${p.name} (${p.distanceFromBasekm}km)`).join('\n')}

Recommended base area address (from geocoding): {baseCentroidAddress}

Write 3 things:
1. summaryText: 1-2 sentences, honest, specific to these places. No hype.
2. baseAreaName: the neighborhood or area name (short, max 4 words)
3. baseAreaReason: 1 sentence explaining why THIS area is the right base (be specific — mention the places or the setup)

Rules:
- Never use: "vibrant", "charming", "perfect", "world-class", "stunning"
- Be specific: mention actual place names from the list
- If the data is thin (< 5 places), say so honestly
- Present tense, third person

Respond with JSON only:
{
  "summaryText": "...",
  "baseAreaName": "...",
  "baseAreaReason": "..."
}
```

### C. Caching strategy
Cache the LLM output per `citySlug` using `unstable_cache` (plain object, NOT Map):
- Revalidate every **7 days** (`revalidate: 604800`)
- If the LLM call fails or times out → fall through to the algorithmic result from
  `computeCitySummary` (no error shown to user)
- Cache key: `["city-narrative", citySlug]`

The plain object return type means `unstable_cache` serializes it correctly (no Map bug).

### D. Integration in `CityContent`
In `src/app/city/[slug]/page.tsx`:

1. Only call `generateCityNarrative` when `isUnlocked === true`
   (free users don't see the base area recommendation detail)
2. Merge output into `CitySummary`:
   - `summary.summaryText` → replaced by LLM `summaryText` if available
   - `summary.recommendedArea` → replaced by LLM `baseAreaName` if available
   - `summary.areaReason` → new field, set to LLM `baseAreaReason`
3. Fall back to algorithmic values if LLM is unavailable
4. Add 3-second timeout with `AbortSignal.timeout(3000)` — city pages should never
   wait more than 3 extra seconds for the AI narrative

### E. `areaReason` in RecommendedAreaCard
Show the `areaReason` text in the `RecommendedAreaCard` component, below the area name.
Style: small italic text, `text-xs text-umber`, max 2 lines.

If `areaReason` is null/undefined → component renders as before (no visible change).

### F. Environment & configuration
- `OPENAI_API_KEY`: required (falls back to algorithmic if not set)
- `OPENAI_NARRATIVE_MODEL`: optional override, defaults to `gpt-4o-mini`
- If API key is missing → log `[narrativeAI] OPENAI_API_KEY not set, using algorithmic fallback`
  and return null (triggering algorithmic fallback)

## Constraints
- LLM must NOT replace the numeric `routineScore` — that stays algorithmic
- LLM narrative generation must be `isUnlocked`-gated (no extra cost for free users)
- If LLM call fails for any reason → silent fallback, no user-visible error
- Timeout: 3 seconds (AbortSignal.timeout)
- Do not stream the response — wait for the full JSON output
- The 7-day cache means most users get near-instant response (cached result)
- Never show raw LLM errors or stack traces on the public page

## Done when
- Unlocked city pages show LLM-generated `summaryText` and `baseAreaName` when available
- `RecommendedAreaCard` shows `areaReason` when set
- Pages fall back silently to algorithmic results if LLM is unavailable or times out
- Free/locked pages are unaffected (no LLM calls)
- `OPENAI_API_KEY` not set → algorithmic fallback, no errors
- Build and lint pass cleanly
