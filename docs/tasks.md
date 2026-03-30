# TrustStay — Execution Checklist

> Updated after LLM narrative, map intent-awareness, grid badge, and SEO metadata batch.  
> Ground truth for product direction and task status.

---

## Product North Star

**TrustStay helps remote workers prepare for the place they already chose.**

- Know where to base yourself
- Know why that area fits your kind of stay
- Know what to plan around before you arrive
- Prepare work, daily life, and purpose — before landing

**What it is not:** discovery tool, directory, generic city guide, LLM-first engine.

**The rule:** Deterministic scoring decides. LLM explains.

---

## Done

Everything in this list is correctly implemented and working.

### Entry flow
- [x] Homepage search intent step — inline purpose + work style step after city selection, skip option, navigates with `?purpose=&workStyle=`
- [x] Search form remembers city selection and waits for intent before navigating (no premature routing)
- [x] Browse destination links carry default intent by category (`CATEGORY_INTENT` map in `DestinationPill`)
- [x] City-page `IntentPrompt` — catches no-intent arrivals via direct URLs, SEO, shared links, activates BestBaseCard on selection
- [x] Change intent — "For surf + light work · Change" link in BestBaseCard header; strips intent from URL; re-shows IntentPrompt

### City page hierarchy
- [x] City page reordered — when intent is present, BestBaseCard leads; neighborhood grid follows as exploration layer
- [x] Auto-discovered cities: if ≥ 3 neighborhoods found + intent → BestBaseCard-first, grid below
- [x] Curated cities with intent (Buenos Aires, Medellín, etc.) → same BestBaseCard-first flow
- [x] `CityNeighborhoodGrid` in `explorationMode` — "Explore other areas" / "Other areas in [City]"
- [x] Intent params propagated through neighborhood grid links
- [x] Recommended neighborhood badge — teal border + "Recommended for your stay" badge on matching area (uses `kvNarrative.baseAreaName` for match)

### BestBaseCard
- [x] Locked state — base area name, intent context, change link, structured placeholder, explicit list of what unlocks
- [x] Unlocked state — LLM narrative `whyItFits` when available, deterministic `buildWhyItFits()` as fallback
- [x] "Plan around" — hard red flag in amber block (always deterministic) + LLM `planAround` as soft note, or `buildTradeoffs()` fallback
- [x] Fit label chip (Good fit / Workable fit / Needs planning)
- [x] Nearby support places row (top work spot + top daily-life place)
- [x] Checkout from BestBaseCard → Stripe → unlock

### LLM narrative layer
- [x] `generateStayFitNarrative()` — constrained system prompt, JSON output, `max_tokens: 300`
- [x] Grounded in `narrativeInputs`: only references place names from `topWorkPlaceNames`; system prompt enforces no invention, no softening of red flags
- [x] KV cache keyed by `stay-fit-narrative:${citySlug}:${purpose}:${workStyle}` — 30-day TTL
- [x] Cache-or-generate orchestration: KV hit returns instantly; miss triggers LLM, stores result, proceeds
- [x] Graceful fallback: `narrativeText` null → `buildWhyItFits()` / `buildTradeoffs()` unchanged
- [x] `OPENAI_API_KEY` configured in `.env.local`

### Scoring engine
- [x] `computeStayFitScore()` — three profiles + generic fallback
- [x] `computeWorkFitScore()` — coworkings, high-workFit cafés, wifi, noise
- [x] `computeDailyLifeScore()` — grocery access, pharmacy access, food sustainability
- [x] Daily-life red flags — deterministic, fire when grocery/pharmacy missing within thresholds
- [x] `StayScoreVector` — profile-independent, populated for future similarity
- [x] `narrativeInputs` — fully populated and ready for LLM handoff
- [x] `purposeFit` — explicitly `null` (honest gap)

### Map
- [x] Map header: "Your base map" when intent present; "Routine map" when not
- [x] Base marker popup: "Your base for surf + light work — La Punta" when intent present; "Suggested base — [City]" fallback
- [x] `baseAreaName` from `stayFit.baseArea` passed to map (uses curated name when available)
- [x] Daily-life markers (grocery + pharmacy) — shown when unlocked
- [x] Work / coffee / wellbeing markers with popups + scroll-to-card behavior

### Copy alignment
- [x] `PaywallCard` — preparation framing, "Get your full setup — $5"
- [x] Landing page: HOW IT WORKS, pricing section names, browse heading ("Pick your spot")
- [x] `RoutineSummaryCard` overline — "How functional is this base?"
- [x] `PlaceSection` subtitles — preparation-oriented
- [x] Footer — "TrustStay — know your base before you arrive."

### Coverage + data
- [x] `CITY_INTROS` — 50 curated city intros with honest writing rules enforced
- [x] `EARLY_COVERAGE_SLUGS` — 48 destinations, muted pill styling + tooltip in browse grid
- [x] Runtime `dataCoverage` flag (good / partial / limited / none); `CoverageNotice` on partial/limited
- [x] Geocode hints for 100+ cities

### Place detail
- [x] `PlaceModal` stay-fit context chip — first work place when intent active
- [x] PlaceFeedback wired to `PlaceCard` (confirm / report issue)
- [x] Google enrichment: address, hours, ratings, Maps link — shown when unlocked, KV-cached

### SEO metadata
- [x] Curated city grid: "Where to base yourself in [City] — work setup & daily life"
- [x] Neighborhood page: "Basing in [Neighborhood], [City] — work setup & daily life"
- [x] Activity city: "[City] — surf + remote work base, setup & preparation"
- [x] Generic city: "Where to base yourself in [City] — work, daily life & stay preparation"
- [x] "digital nomads" and "wifi spots & cafés" removed from titles

### Infrastructure
- [x] Stripe checkout + unlock flow (pass + bundle)
- [x] KV caching — places, daily life, enriched Google data, city narratives, stay-fit narratives
- [x] PostHog analytics — full suite including intent events, stay-fit properties, coverage

---

## Still Missing

Ordered by product impact.

### 1. Hero headline still uses old-product framing ❌ HIGH IMPACT

Current: **"Land in a new spot. Keep your routine from day one."**

"Keep your routine from day one" implies you land first, then figure it out. The new model is "know before you arrive." The subtext fixes this partially ("find your base area... before you arrive"), but the H1 — the first thing every visitor reads — still sounds like the old product.

The search button makes it worse: **"Map my routine"** is the button label on `CitySearch`. This is the only visible action on the hero and it says "routine" not "base" or "setup."

These two lines are the most visible old-product remnants in the entire codebase.

---

### 2. Search button copy: "Map my routine" ❌ HIGH IMPACT

`CitySearch.tsx` line 234: `"Map my routine"` — this is the CTA button on the hero search form. It's the most prominent action on the homepage and it directly contradicts the new product framing. Should be "Find my base" or "Get my setup."

---

### 3. PaywallCard without intent — locked items refer to nothing specific ⚠️ MEDIUM IMPACT

When a user has NOT shaped their stay (intent === null), `PaywallCard` still shows the locked item "Why your base fits and what to plan around" — but no base recommendation is active yet and `BestBaseCard` hasn't computed one.

The `IntentPrompt` renders above the place sections (before `PaywallCard`) so most users will see it, but users who dismiss the prompt still hit a paywall that references a "base" that doesn't exist for them yet.

---

### 4. No deep-link from BestBaseCard recommendation to neighborhood page ⚠️ MEDIUM IMPACT

When BestBaseCard recommends "La Punta" in Puerto Escondido, there's no link from the recommendation to the La Punta neighborhood page. The user reads "La Punta" and can only find it by scrolling to the exploration grid below.

For cities with curated neighborhoods, the KV narrative's `baseAreaName` could link directly to the neighborhood slug. For auto-discovered cities, the grid provides the navigation — but there's no visual call-to-action from the card itself.

---

### 5. RecommendedAreaCard fallback text is hedgy ⚠️ LOW IMPACT

`RecommendedAreaCard` (shown when no intent is set) renders a fallback reason text: "This is where work spots, gyms, and food options seem to cluster. A useful starting point — not a precise neighborhood boundary."

The hedge ("not a precise boundary") is accurate but it makes the product feel less confident than it should. The area centroid calculation is real and reasonably accurate. The copy undersells it.

---

### 6. Destination coverage system is still static ❌ LOW IMPACT

`EARLY_COVERAGE_SLUGS` in `DestinationBrowse.tsx` is a manually maintained set of 48 slugs. There is no runtime mechanism to detect when a city has thin coverage (< 6 places) and automatically flag it. When a city's OSM coverage improves, someone has to manually remove it from the set.

The `dataCoverage` flag is computed at runtime in `CityContent`, but it doesn't flow back to the browse grid.

---

### 7. Saved bases / bookmarks — not built ❌ LATER

No localStorage save of city + intent. Users who close the tab lose all context.

---

### 8. Post-stay validation — not built ❌ LATER

No email 4 weeks after purchase. The confirmed-place data is collected but not flowing into LLM context meaningfully.

---

### 9. `purposeFit` scoring is null — activity dimension missing ❌ LATER

Activity POI data (surf breaks, trailheads, yoga studios) not queried. `purposeFit` is always `null`. Honest, but means the fit score for activity users only reflects work + daily-life.

---

## Next

Ordered by leverage. Execute in this sequence.

### 1. Hero H1 copy + search button label (copy only, 15 minutes)
**Files:** `src/app/page.tsx`, `src/components/CitySearch.tsx`  
**What:** Change H1 from "Land in a new spot. Keep your routine from day one." to something anchored in preparation. Change search button from "Map my routine" to "Find my base" or "Get my setup."  
**Why first:** These are the two most-read strings in the product and both still say the old thing.

### 2. PaywallCard intent-awareness (copy, 20 minutes)
**File:** `src/components/PaywallCard.tsx`  
**What:** When `PaywallCard` renders without active intent context (the "why your base fits" item doesn't mean anything yet), the locked item list should say "Your best base recommendation — where to stay and why" rather than presupposing a specific base.  
**Why second:** Low effort, removes the confusing promise of a base when no intent is set.

### 3. BestBaseCard → recommended neighborhood deep-link (implementation, small)
**Files:** `src/components/BestBaseCard.tsx`, `src/data/neighborhoods.ts`  
**What:** When `stayFit.baseArea` matches a known neighborhood name in the curated neighborhoods for that city, add a subtle "View full setup for La Punta →" link in the unlocked state.  
**Why third:** Closes the exploration loop without adding complexity.

### 4. RecommendedAreaCard fallback copy (copy only, 5 minutes)
**File:** `src/components/RecommendedAreaCard.tsx`  
**What:** Replace "A useful starting point — not a precise neighborhood boundary" with more confident honest language: "This is where work infrastructure clusters — start here, adjust once you know the area."

---

## Later

Do not build until Next 1–4 are done.

- **Dynamic coverage tier detection** — runtime `dataCoverage` flags flowing back to browse grid; replace static `EARLY_COVERAGE_SLUGS` set
- **`purposeFit` scoring** — Overpass queries for surf breaks, trailheads, yoga studios
- **Saved bases** — localStorage save of city + intent for return visit restoration
- **Post-stay email validation** — 4-week post-purchase feedback loop
- **LLM follow-up Q&A** — 1–2 contextual questions answered in BestBaseCard after unlock; only after LLM narrative is proven stable
- **Expand curated neighborhoods** — Tulum, Santa Teresa, Nosara, Florianópolis (currently 8 cities curated)
- **City-level vs neighborhood-level unlock clarity** — city pass should arguably propagate to the recommended neighborhood

---

## Recommended Execution Order

```
1. Hero H1 + search button copy          (copy, 15 min, highest visibility gap)
2. PaywallCard intent-awareness           (copy, 20 min)
3. BestBaseCard → neighborhood deep-link  (small implementation)
4. RecommendedAreaCard copy               (copy, 5 min)
5. [ship and test with real users]
6. Dynamic coverage tier detection        (implementation, medium)
7. Saved bases                            (when return-visit rate is measurable)
```

---

## Open Questions

Only real, unresolved ones.

**1. City-level vs neighborhood-level unlock model**  
A user unlocks the city-level BestBaseCard for Puerto Escondido. BestBaseCard says "La Punta." They click through to the La Punta neighborhood page — and it's still locked. Is this the intended behavior? Currently yes (separate Stripe sessions). This might feel broken to users who expect the city unlock to include their recommended area.

**2. LLM narrative cache invalidation**  
Place data has a 14-day KV TTL. The LLM stay-fit narrative has a 30-day TTL. If a new coworking opens and the place cache refreshes in week 2, the LLM narrative won't update for another 16 days. Is that acceptable? Currently yes — but it means the narrative could reference places that have closed. No invalidation mechanism exists yet.

**3. Auto-discovered neighborhood grid without intent**  
For multi-neighborhood cities without intent (e.g. `city/puerto-escondido` with no `?purpose=`), the user sees the neighborhood grid first, then clicks into a neighborhood page where the IntentPrompt appears. Should the IntentPrompt instead appear on the city-level grid page to activate BestBaseCard earlier? Currently it only appears inside `CityContent`, not on the grid page.

**4. Thin cities + IntentPrompt**  
A user hits a thin city (e.g. Gigante) without intent. IntentPrompt shows, they select surf + light. `computeStayFitScore` runs on 2–3 places and produces a low-confidence BestBaseCard. The experience is technically correct (CoverageNotice fires, fitLabel is "Needs planning") but it might feel misleading — BestBaseCard is a strong-looking card for a weak dataset. Should BestBaseCard be suppressed below a minimum place threshold?
