# Task 20 — Admin CMS: AI-Generated City Narratives

## Objective
The admin is the single source of truth for all city narrative content.
An admin generates, reviews, edits, and saves city narratives (intro, base area,
summary) from the admin panel. The city page reads from this store — no file edits,
no deploys needed to publish new city content.

## Problem
- City intros today require editing a TypeScript file + deploying
- Base area reasoning is purely algorithmic — it can't explain *why* La Punta beats Zicatela
- We have 250+ destinations but generating good copy for all of them takes days manually
- There's no way to update or correct published content without a code change

## Architecture

```
Admin panel
  → Fetch places (Overpass)
  → LLM generates narrative (GPT-4o, using real place data)
  → Admin reviews + edits in textarea
  → Save → Upstash Redis KV

City page (/city/[slug])
  → Read from KV first  (fresh, admin-managed)
  → Fallback: cityIntros.ts  (static hand-written entries)
  → Fallback: algorithmic computeCitySummary  (always available)
```

## Storage: Upstash Redis
Use `@upstash/redis` (free tier — 10k requests/day, no credit card required).

Environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

KV key pattern: `city-narrative:{citySlug}` → JSON value:
```ts
interface StoredNarrative {
  citySlug: string;
  cityName: string;
  intro: string;           // 2-3 sentence editorial intro
  activity: string | null; // "surf" | "dive" | "hike" | "yoga" | "kite" | "work"
  bestMonths: string | null;
  summaryText: string;     // 1-2 sentences about the overall remote-work setup
  baseAreaName: string;    // e.g. "La Punta"
  baseAreaReason: string;  // 1 sentence: why this area
  generatedAt: string;     // ISO date
  editedAt: string | null; // ISO date if admin manually edited after generation
}
```

If KV is not configured → skip all KV reads/writes silently, fall through to static.

## Must include

### A. Admin UI: "City Narratives" section
New collapsible section in `/admin`, opened by default if there are saved narratives.

**Step 1 — Select city**
- Text input: city name (free text)
- Auto-generates slug (editable)
- Shows existing saved narrative if one exists for the slug (with "Last generated:" date)

**Step 2 — Fetch & Generate**
- Button "Fetch places + Generate with AI"
- Calls `POST /api/admin/generate-narrative`
- Shows a loading state: "Fetching places from Overpass… Generating narrative…"
- On success: populates the four editable textareas below

**Step 3 — Review & Edit**
Four editable textareas (pre-filled by LLM, admin can change anything):
- **Intro** (2–3 sentences, the editorial paragraph shown above the neighborhood grid)
- **Summary** (1–2 sentences about the remote-work setup — shown in the RoutineSummaryCard)
- **Base area name** (short, e.g. "La Punta")
- **Base area reason** (1 sentence shown in RecommendedAreaCard)

Also shows the activity select (surf/dive/hike/yoga/kite/work) and bestMonths input.

**Step 4 — Save**
- Button "Save narrative"
- Calls `POST /api/admin/save-narrative`
- Saves to Upstash KV
- Shows "Saved ✓ {citySlug} — {date}"

**Saved narratives list**
Below the generator: a list of all saved narratives, sorted by `generatedAt` desc.
Columns: city slug · last generated · actions (Edit, Delete, Preview link).
Clicking "Edit" re-populates the textareas for that city.

### B. API route `POST /api/admin/generate-narrative`
Request:
```json
{
  "citySlug": string,
  "cityName": string,
  "secret": string
}
```

Server-side steps:
1. Validate admin secret
2. Geocode the city (use existing `geocodeCity` function)
3. Fetch places from Overpass (use existing `fetchPlaces`)
4. Enrich top 5 work + top 5 café places only (to limit Google API cost)
5. Build LLM prompt (see §D)
6. Call OpenAI `gpt-4o` (best quality — admin uses this rarely)
7. Parse JSON response
8. Return the narrative fields

If `OPENAI_API_KEY` is not set → return `{ error: "openai_not_configured" }`.
If geocoding fails → return `{ error: "city_not_found" }`.

### C. API route `POST /api/admin/save-narrative`
Request: full `StoredNarrative` object + `secret`.
Saves to Upstash: `await redis.set(\`city-narrative:${citySlug}\`, JSON.stringify(data))`.
Returns `{ ok: true }`.

### D. API route `GET /api/admin/narratives`
Returns all saved narratives: scans KV for keys matching `city-narrative:*`.
Used by the admin list view.

### E. API route `DELETE /api/admin/narratives/[slug]`
Deletes a saved narrative from KV. City page falls back to static/algorithmic.

### F. LLM prompt
```
You are an editor for Truststay, a neighborhood guide for remote workers and
location-independent professionals.

City: {cityName}, {country}
Routine score: {routineScore}/100 (from place density and quality)
Total places found: {totalPlaces}

Work spots near the recommended base:
{topWorkPlaces}

Cafés and meal spots:
{topCafes}

Recommended base area address (from geocoding): {baseCentroidAddress}

Write 4 pieces of content for this city. Be honest, specific, never use hype words
("vibrant", "charming", "perfect", "world-class", "stunning").

1. intro: 2-3 sentences, activity-first, specific neighborhoods. Who comes here and why?
   What's the one thing to know about choosing where to stay?
2. summaryText: 1-2 sentences about the practical remote-work setup based on the places listed.
3. baseAreaName: the specific neighborhood or area name that's the best base (max 4 words).
4. baseAreaReason: 1 sentence explaining why that area is better than alternatives,
   referencing the actual places or the data.

Respond with JSON only:
{
  "intro": "...",
  "activity": "surf" | "dive" | "hike" | "yoga" | "kite" | "work" | null,
  "bestMonths": "..." | null,
  "summaryText": "...",
  "baseAreaName": "...",
  "baseAreaReason": "..."
}
```

### G. City page integration
In `src/app/city/[slug]/page.tsx`:

1. Add `getCityNarrative(citySlug)` function that reads from KV:
```ts
async function getCityNarrative(slug: string): Promise<StoredNarrative | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(`city-narrative:${slug}`);
    return data ? (data as StoredNarrative) : null;
  } catch { return null; }
}
```

2. In `CityContent`, fetch narrative alongside places:
```ts
const [allPlaces, narrative] = await Promise.allSettled([
  fetchPlaces(city),
  getCityNarrative(city.slug),
]);
```

3. Merge into display:
   - `narrative.intro` → replaces `CityIntro` component (if available)
   - `narrative.summaryText` → replaces `summary.summaryText` in RoutineSummaryCard
   - `narrative.baseAreaName` → replaces `summary.recommendedArea`
   - `narrative.baseAreaReason` → new field in RecommendedAreaCard

4. Fallback chain:
   - KV narrative → `CITY_INTROS[slug]` → algorithmic result

### H. RecommendedAreaCard: show baseAreaReason
Add a `reason?: string` prop.
If set, render below the area name:
```tsx
{reason && (
  <p className="mt-1 text-xs italic text-umber leading-5">{reason}</p>
)}
```

## Constraints
- Upstash KV must be optional — if not configured, all KV paths are no-ops
- Admin secret required on all write routes
- Generated content is a draft — admin must explicitly click "Save" to publish
- No LLM calls on the public city page (all LLM work happens in admin)
- GPT-4o for admin generation (quality > cost for infrequent admin use)
- Do not expose Upstash credentials to the client

## Done when
- Admin can type a city, fetch places, generate AI narrative, edit, and save
- Saved narratives appear on the city page (intro + summary text + base area reason)
- Admin can list, edit, delete all saved narratives
- City pages fall back gracefully: KV → static file → algorithmic
- RecommendedAreaCard shows the AI-generated reason when available
- Upstash not configured → all KV paths are silent no-ops, no errors
- Build and lint pass cleanly
