# TrustStay — City-Level Best Base: Page Reorder v1

## 1. Product goal

When a user arrives at a city page with intent (`?purpose=surf&workStyle=light`), TrustStay should answer the primary question immediately:

> **"Where should I base myself in Puerto Escondido for surf + light work?"**

Right now, that question is deferred. The user sees a neighborhood grid, picks one manually, then gets the analysis. TrustStay acts as a lookup tool instead of a recommendation engine.

The goal of this reorder is to make the city page the **primary decision layer** — not a selection menu. The neighborhood grid becomes a supporting layer that lets the user confirm, compare, or explore after the recommendation is already in front of them.

---

## 2. Why the current order is still slightly misaligned

### What happens today (for multi-neighborhood cities with intent)

```
/city/puerto-escondido?purpose=surf&workStyle=light
  → AutoNeighborhoodOrContent runs discoverNeighborhoods
  → if ≥3 found → CityNeighborhoodGrid renders (full screen, immediate)
  → BestBaseCard never runs
  → user must pick a neighborhood themselves
  → /city/la-punta?purpose=surf&workStyle=light
  → BestBaseCard finally answers the question
```

The user has to **self-select the answer before TrustStay gives it.**

### The misalignment

| What the user came to learn | What the current flow gives them |
|---|---|
| Where should I stay in Puerto Escondido? | A grid of neighborhoods — you pick |
| Why does this area fit surf + light work? | Nothing until they click a neighborhood |
| What should I plan around? | Only visible after self-selection |

The intent parameters are present in the URL. The scoring engine (`computeStayFitScore`) is capable of running at city level. The data is available. But the routing logic (`AutoNeighborhoodOrContent`) bypasses all of it the moment it detects ≥3 neighborhoods, showing the grid instead of the recommendation.

This is a routing decision, not a data problem.

---

## 3. Recommended new section order (multi-neighborhood city page with intent)

```
1.  City header (name, country, intro text)
2.  [Shape this stay] intent selector — if no intent yet
3.  CityMap — spatial context first, shows all neighborhoods lightly
4.  BestBaseCard — PRIMARY LAYER — answers "where should I base myself?"
5.  Work / Coffee & Meals / Wellbeing — place sections for the recommended base
6.  [Divider] "Explore other areas"
7.  CityNeighborhoodGrid — stripped down, labeled as "explore / compare"
8.  MethodologyNote / EmailCapture
```

When no intent is present, the order collapses to:

```
1.  City header
2.  CityMap
3.  RoutineSummaryCard + RecommendedAreaCard
4.  Work / Coffee & Meals / Wellbeing
5.  CityNeighborhoodGrid — "Explore neighborhoods"
6.  PaywallCard (if locked content)
```

This means the neighborhood grid is never gone — it just stops being the first thing the user sees when they have intent.

---

## 4. Where BestBaseCard should sit

**Position**: immediately after the map, before place sections.

This is the correct position because:

- The map establishes spatial orientation (the user sees where La Punta is relative to the city)
- BestBaseCard answers the question that the map just raised ("so which of those areas is right for me?")
- Place sections then fill in the detail for that recommended base — they flow naturally from the answer, not before it

BestBaseCard should feel like a direct response to the map, not an afterthought appended below place sections.

At city level, BestBaseCard should use city-level scoring — the same `computeStayFitScore` path already used on neighborhood pages. The only change is that it runs **before** the user selects a neighborhood, on the city's aggregate place data.

---

## 5. What the neighborhood grid becomes in the new model

### Today
The grid is the **first decision point**. Users must pick a neighborhood to get any answer.

### After reorder
The grid is a **confirmation and exploration layer**. It appears after the recommendation with a new framing:

**Label**: "Explore other areas"  
**Subtitle**: "La Punta is your best fit — but here's how other neighborhoods in Puerto Escondido compare."

The grid cards can optionally carry a lightweight fit signal:

- `✓ Best fit` badge on the recommended neighborhood
- No badge or label on other neighborhoods (let the user click through)

The grid should be visually quieter than it is today — smaller heading, no hero treatment. It confirms and expands. It does not decide.

### What the grid does NOT become
- A replacement for BestBaseCard
- A ranked comparison table (too mechanical for v1)
- Hidden or removed (it still has value for exploration and SEO)

---

## 6. How free vs locked should work at city level

The free/locked logic does not change. What changes is **where** the conversion moment happens.

| State | What the user sees |
|---|---|
| No intent | City summary + place sections (1 free card each) + PaywallCard |
| Intent, locked | BestBaseCard (locked state: shows base area name, teases why-it-fits + tradeoffs) + place sections (1 free card each) |
| Intent, unlocked | BestBaseCard (full analysis) + all place sections unlocked + "Explore other areas" grid |

The BestBaseCard locked state already contains a clear list of what unlocks:
- Why this base fits your kind of stay
- Tradeoffs and what to plan around
- All work spots, cafés, and wellbeing places

This is the single conversion point when intent is present. PaywallCard is suppressed (already implemented).

### City-level vs neighborhood-level unlock
At city level, unlocking should cover the entire city — not just the recommended base. The user is paying to understand the place, not just one block. This aligns with the current `isUnlocked(slug)` logic which already handles bundle unlocks.

---

## 7. How map and grid should support the recommendation

### Map
When intent is present and BestBaseCard has a recommendation:
- The recommended base area should be visually emphasized — lighter grey dot → full-color marker or a subtle highlighted zone
- Other neighborhoods appear as lighter markers or are not individually labeled
- The map should reinforce: "this is where your base is" before the card explains why

Implementation path: the base centroid (`baseCentroid`) is already computed and passed to `CityMap`. A simple extension would be to pass a `recommendedAreaName` prop and render a labeled pin or highlight zone at the centroid when present.

### Grid
The grid should not render identically whether or not BestBaseCard is above it.

When BestBaseCard is present:
- Grid heading changes: "Where to base yourself in Puerto Escondido" → "Explore other areas in Puerto Escondido"
- Grid subtitle changes: "Pick a neighborhood" → "Compare other neighborhoods for your kind of stay"
- Recommended neighborhood card gets a `Best fit` badge
- Grid is visually de-emphasized (smaller, lower visual weight than BestBaseCard)

When BestBaseCard is not present (no intent):
- Grid stays as it is today — it is the primary navigation layer

---

## 8. Example flow: Puerto Escondido

**URL**: `/city/puerto-escondido?purpose=surf&workStyle=light`

**Current flow (broken)**:
1. AutoNeighborhoodOrContent detects 3+ neighborhoods
2. CityNeighborhoodGrid renders immediately
3. User sees: "Where to base yourself in Puerto Escondido" + 4 cards (La Punta, Rinconada, Centro, Bacocho)
4. User must pick — no recommendation given
5. User clicks La Punta → `/city/la-punta?purpose=surf&workStyle=light`
6. BestBaseCard finally renders with: "Your base in Puerto Escondido · La Punta"

**New flow (correct)**:
1. `/city/puerto-escondido?purpose=surf&workStyle=light` resolves city + intent
2. computeStayFitScore runs at city level → outputs: base = La Punta, fitScore = 74, redFlags = ["No confirmed coworking close to La Punta"]
3. User sees:
   - City header: "Puerto Escondido, Mexico"
   - CityMap: centroid near La Punta highlighted
   - BestBaseCard: "Your base in Puerto Escondido · La Punta · Good fit for surf + light work" (if unlocked) or locked teaser (if not)
   - Work / Coffee & Meals / Wellbeing sections for the La Punta area
   - [divider] "Explore other areas" → same neighborhood grid, quieter, La Punta badged
4. User clicks "Explore other areas → Rinconada" → `/city/rinconada?purpose=surf&workStyle=light`
5. Neighborhood page for Rinconada loads with its own BestBaseCard analysis

The core question is answered on step 3 — not after the user makes a choice.

---

## 9. Example flow: Medellín

**URL**: `/city/medellin?purpose=work_first&workStyle=heavy`

Medellín has curated neighborhoods: El Poblado, Laureles, Envigado, Sabaneta.

**Current flow**: `CURATED_NEIGHBORHOODS["medellin"]` matches → grid renders immediately, no scoring runs.

**New flow**:
1. City page detects intent + curated neighborhoods
2. Runs `computeStayFitScore` for the city (using El Poblado's coordinates as starting centroid, or the city centroid)
3. Score output: base = El Poblado, fitScore = 81, profile = `activity_heavy_work`, redFlags = []
4. User sees:
   - BestBaseCard: "Your base in Medellín · El Poblado · Strong fit for focused work + intensive work"
   - Work / Coffee & Meals / Wellbeing sections for El Poblado
   - "Explore other areas" grid: El Poblado badged, Laureles, Envigado, Sabaneta below
5. User curious about Laureles → clicks through → deeper neighborhood analysis

For curated cities, this also means `CityNeighborhoodGrid` stops being the only render path in `CityPage`. The curated branch needs the same intent-aware branching that `AutoNeighborhoodOrContent` will get.

---

## 10. Final recommendation

### The one change that matters most

In `AutoNeighborhoodOrContent` (and the curated city branch in `CityPage`), change the branching logic from:

```
if (neighborhoods.length >= 3) → show grid
else → show CityContent
```

To:

```
if (intent is present) → show BestBaseCard layout (with grid below)
else if (neighborhoods.length >= 3) → show grid (current behavior)
else → show CityContent (current behavior)
```

This is a routing change, not a UI redesign. The components already exist.

### Minimum implementation for v1

1. **New layout path**: When `intent` is present on a multi-neighborhood city, render `CityContent` instead of (or wrapping) `CityNeighborhoodGrid`. BestBaseCard answers first. Grid appears at the bottom as "Explore other areas."

2. **Grid role update**: Pass a prop like `recommendedSlug` to `CityNeighborhoodGrid` — the grid uses it to badge one card as "Best fit" and adjusts its heading/subtitle.

3. **Curated cities**: The same intent-aware branch needs to apply to `CURATED_NEIGHBORHOODS` slugs. Currently they skip `CityContent` entirely — they need to route through it when intent is present.

4. **Map**: No change needed immediately. The centroid pin already anchors the map to the base area. A labeled pin or highlight zone can come in a later pass.

### What does not change

- Free/locked logic — identical to today
- PaywallCard suppression when BestBaseCard is active — already implemented
- BestBaseCard component — no changes needed
- Neighborhood page behavior — unchanged, still the deep layer
- SEO / static params — unchanged

### What this unlocks next

Once the city page answers the base question, the natural next step is the **"Shape this stay" intent input module** — a small inline UI on the city page that writes `?purpose=` and `?workStyle=` to the URL when the user doesn't arrive with intent. Without that module, the city-level recommendation is only reachable via direct URL or neighborhood grid links. With it, the city page becomes a complete self-contained product moment.

That module is milestone 2. The page reorder described here is the prerequisite.
