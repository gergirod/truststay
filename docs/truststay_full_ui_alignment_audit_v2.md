# TrustStay — Full UI Alignment Audit v2

> Written after: LLM narrative, intent-aware map, grid badge, SEO metadata batch.  
> Grounded in the actual current codebase state.

---

## 1. Executive Summary

The product is substantially more coherent than it was three weeks ago. The core user flow — city search → intent collection → BestBaseCard → place detail — now tells a preparation story from start to finish. The big structural work is done.

**Two critical old-product remnants still exist on the highest-traffic surface (homepage):**
1. The H1 headline: **"Land in a new spot. Keep your routine from day one."** — implies you arrive first, then figure it out. That is the old model.
2. The search button: **"Map my routine"** — the most prominent call-to-action on the homepage actively contradicts the new framing.

Everything else is at most a minor copy issue. No surface actively misleads the user about what TrustStay does — but these two lines are read by every single visitor before they interact with anything.

**Verdict:** The product tells 90% of one coherent story. The remaining 10% is almost entirely concentrated in two strings on the homepage and one functional gap (no deep-link from BestBaseCard to the recommended neighborhood page).

---

## 2. What Feels Fully Aligned

The following surfaces are clean. No changes recommended.

### Intent collection
- `CitySearch` — two-step flow (city → intent inline) with skip and back options. Correct design. Purpose pills are immediately readable. Work style sub-labels ("a few hours a day", "half days", "full remote") are concrete and useful.
- `IntentPrompt` on city page — appears naturally in the flow, collects purpose + work style without being a modal. "What kind of stay are you planning in [City]?" is the right question. "We'll find your best base and what to prepare before you arrive." is the correct product promise. Skip is unobtrusive.
- Browse destination pills — `CATEGORY_INTENT` map pre-fills `?purpose=&workStyle=` correctly by category. The early-coverage muted pill styling is honest and doesn't break the flow.

### BestBaseCard
- Locked state: shows base area name, intent context, change link, and a structured placeholder. The locked item list ("Why this base fits your kind of stay", "Tradeoffs and what to plan around", "All work spots, cafés, and wellbeing places") is the right level of specificity — it doesn't over-promise and doesn't under-deliver on setup.
- Unlocked state: "Why it fits" paragraph (LLM when available, deterministic fallback), "Plan around" amber block (deterministic red flag) + soft note (LLM `planAround` or `buildTradeoffs()`), "Nearby that works for you" row with scroll-to-place links. Correct architecture.
- Change intent flow: strips `purpose` and `workStyle` from URL, re-shows `IntentPrompt`. Clean and correct.
- CTA copy: "Unlock your base →" and "One-time · No account needed · Instant access". Aligned.

### City page structure
- When intent is present: BestBaseCard leads, `RoutineSummaryCard` ("How functional is this base?") acts as supporting context.
- Neighborhood grid in `explorationMode`: "Explore other areas" heading. Correct framing — it's confirmation, not the first decision step.
- Recommended neighborhood badge: teal border + "Recommended for your stay" dot badge. Subtle but visible.
- Intent params propagated through grid links.

### Map (intent-aware)
- "Your base map" header when intent present; "Routine map" fallback. Correct.
- Base marker popup: "Your base for surf + light work — La Punta" when intent active. Specific and honest.
- Daily-life markers (grocery + pharmacy) shown when unlocked.
- Total place count chip in the header: "X places nearby" — neutral, useful.

### PaywallCard
- Overline: "Your stay setup — [City]"
- Headline: "Everything you need before you arrive"
- Body: "Unlock to get the full picture — what fits, what to plan around, and every option sorted by distance from your base."
- Primary CTA: "Get your full setup — $5"
- Locked item: "Why your base fits and what to plan around" — this is *almost* correct (see Section 4 below for one nuance).
- Bundle secondary CTA: "Get the full [City] setup — $15". Clear.

### HOW IT WORKS
- "Tell us where you're going and how you work" → "Get your base recommendation" → "Arrive knowing your setup". Fully aligned. No remnants.

### PlaceSection subtitles
- Work: "Coworkings and work-friendly cafés near your base"
- Coffee & meals: "Places to grab coffee, breakfast, or lunch without breaking your day"
- Wellbeing: "Gyms, yoga, and places to keep your body in check"
All preparation-oriented. Clean.

### PlaceModal
- Stay-fit context chip: "✦ For surf + light work: closest work option near La Punta" — correct level of specificity.
- Confidence signals ("Verified", "Likely", "Unknown") — honest.
- Address, hours, ratings, Maps link shown when unlocked.

### SEO metadata
- All page types now use: "Where to base yourself in [City]", "work setup & daily life", "what to plan around".
- "digital nomads" and "wifi spots & cafés" fully removed.

### Footer
- "TrustStay — know your base before you arrive." — correct and specific.

---

## 3. What Still Feels Like Old TrustStay

Ordered by visibility impact.

### 3.1 Homepage H1: "Land in a new spot. Keep your routine from day one."

**Severity: High. Highest-visibility string in the product.**

This is the first thing every user reads. "Keep your routine from day one" belongs to the old product — it described getting functional after landing. The new product is about knowing before you land. The sub-copy partially fixes it ("find your base area... before you arrive"), but the headline frames the experience as reactive ("land... keep") rather than proactive ("prepare").

The headline makes TrustStay sound like a tool for recovering from a bad landing, not for avoiding one.

### 3.2 Search button: "Map my routine"

**Severity: High. The primary action on the hero.**

`CitySearch.tsx` line 371: `"Map my routine"` is the submit button label. Every user who types a city and clicks this CTA is told they're "mapping a routine." That's the old product: place scout + POI map. The new product gives them a base recommendation and a preparation checklist.

This button costs one line of code to fix and is the single most visible old-product string in the codebase.

### 3.3 RecommendedAreaCard fallback text undersells the recommendation

**Severity: Low. Only shows without intent.**

`RecommendedAreaCard.tsx` line 47: `"This is where work spots, gyms, and food options seem to cluster. A useful starting point — not a precise neighborhood boundary."` — the hedge makes sense as a disclaimer, but it frames the product as guessing rather than calculating. The centroid is real. The area recommendation is based on actual POI clustering. The current copy sounds less confident than the product actually is.

### 3.4 Hero eyebrow is narrow, not false, but could be stronger

**Severity: Very low.**

"For remote workers who travel with a purpose" — this is accurate and fine. Slightly abstract. "For remote workers who already know where they're going" would be sharper and would pre-answer the "is this for me?" question faster. Not urgent.

### 3.5 Search placeholder mentions Shoreditch

**Severity: Very low.**

`placeholder="e.g. Lisbon, El Poblado, Shoreditch"` — Shoreditch suggests TrustStay covers European neighborhood-level searches. The catalog is focused on Latin America, the Caribbean, and select international destinations. This creates a minor expectation mismatch when European users type a city and get a "not found" result.

---

## 4. Surface-by-Surface Audit

### 4.1 Homepage hero

| | |
|---|---|
| **Status** | Partially aligned |
| **What works** | Layout, subtext, glass card, CitySearch component, eyebrow |
| **What's misaligned** | H1 headline, search button label |
| **Old model it suggests** | "Land somewhere and find your way around" (reactive) |
| **Fix** | Change H1; change button label — copy only, one file each |

Current H1: `"Land in a new spot. Keep your routine from day one."`  
Suggested direction: `"You chose the place. Now know where to land."` or `"Know your base before you arrive."`

Current button: `"Map my routine"`  
Suggested: `"Find my base"` or `"Get my setup"`

---

### 4.2 Homepage search flow (`CitySearch`)

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Two-step flow, purpose pills, work style step, skip, back, autocomplete |
| **Minor gap** | Button label ("Map my routine"), placeholder mentions Shoreditch |
| **Fix** | Copy only — button label in `CitySearch.tsx` |

The search step → intent step → navigate flow is the right architecture. The inline intent collection before navigation is the correct product sequence.

---

### 4.3 Browse / curated destinations section

| | |
|---|---|
| **Status** | Aligned |
| **What works** | "Pick your spot" heading, "Already know where you're going?" body, intent pre-fill by category, early-coverage muted styling |
| **Minor gap** | Early-coverage tooltip ("Early coverage — some sections may be limited") could mention that recommendations are based on limited data, not just that "sections may be limited" |
| **Fix** | Copy only, low priority |

---

### 4.4 HOW IT WORKS

| | |
|---|---|
| **Status** | Aligned |
| **What works** | All three steps match the preparation narrative |
| **Old model** | None present |
| **Fix** | None needed |

---

### 4.5 Pricing / paywall (homepage section)

| | |
|---|---|
| **Status** | Aligned |
| **What works** | "What's included", "Stay Setup", "$5 one-time per area", PASS_FEATURES list, BUNDLE_FEATURES list |
| **Minor gap** | BUNDLE_FEATURES says "Full setup for every area in the city" — "every area" implies the value is breadth (more places, more areas). The stronger framing is "prepared for any neighborhood in [City]" or "every base option ready to compare." |
| **Fix** | Copy only, low priority |

---

### 4.6 City page intro (`CityIntro`)

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Curated city intros follow strict writing rules — destination, area character, what to expect; no hype, no claims about wifi speed |
| **Gap** | Non-curated cities don't have a `CityIntro` — they fall back to `RoutineSummaryCard` as the first text content above the fold. That card shows a numeric score which is appropriate but abstract without context. |
| **Fix** | Expanding `cityIntros.ts` coverage is a data task, not urgent |

---

### 4.7 BestBaseCard

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Locked/unlocked states, LLM narrative, deterministic red flag, "Plan around", "Nearby that works for you", Change flow, CTA copy |
| **Gap** | No deep-link from the recommended base area name to the neighborhood page (for curated cities). User sees "La Punta" and has to scroll to the grid to find it. |
| **Fix** | Small implementation task — add "View full setup for [Base] →" link in unlocked state |

---

### 4.8 Intent change / reselection flow

| | |
|---|---|
| **Status** | Aligned |
| **What works** | "Change" link strips `purpose` + `workStyle` from URL; `IntentPrompt` re-appears; intent pill shows intent in BestBaseCard header |
| **Gap** | None |

---

### 4.9 Neighborhood grid (`CityNeighborhoodGrid`)

| | |
|---|---|
| **Status** | Aligned |
| **What works** | `explorationMode` heading ("Explore other areas"), recommended badge, intent params in links |
| **Minor gap** | `NeighborhoodCard` does not show any intent-aware sub-copy ("Good for surf + light work" vs "Best work hub"). The card just shows the neighborhood name, a brief description, and the "Recommended for your stay" badge. The badge is correct but the surrounding copy doesn't reinforce why it's recommended. |
| **Fix** | Copy only or minor implementation — low priority |

---

### 4.10 Map section (`CityMap`)

| | |
|---|---|
| **Status** | Mostly aligned |
| **What works** | Intent-aware header and base marker popup; daily-life markers; locked/free marker distinction |
| **Minor gap** | "Routine map" fallback label (shown without intent) still has "routine" framing. "Your stay map" or "Place overview" would be more neutral without being misleading. |
| **Fix** | Copy only, one line |

---

### 4.11 List / section labels (`PlaceSection`)

| | |
|---|---|
| **Status** | Aligned |
| **What works** | "near your base" language in subtitles |
| **Minor gap** | When intent is active, section subtitles don't reflect it. "Coworkings and work-friendly cafés near your base" is fine; "Coworkings near your base for intensive work" would be stronger for `heavy` work style. Not necessary in v1. |
| **Fix** | Copy only, low priority |

---

### 4.12 `RoutineSummaryCard`

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Overline "How functional is this base?", numeric score, summaryText, confidence note |
| **Minor gap** | The label "How functional is this base?" is correct when intent is absent. When intent IS present, BestBaseCard already answers the personalized question — so `RoutineSummaryCard` becomes secondary context. Its label still says "base" which might confuse: is this the generic "base" or the recommended one? |
| **Fix** | None urgent — when intent is present, `RoutineSummaryCard` is shown above `BestBaseCard` as score context. The hierarchy is correct. |

---

### 4.13 Recommended area language

| | |
|---|---|
| **Status** | Mostly aligned |
| **What works** | BestBaseCard uses `stayFit.baseArea` (populated by `reverseGeocodeArea` with curated KV names) |
| **Gap** | `RecommendedAreaCard` (shown without intent) still says "Suggested base area" in the overline and hedges in the body. These are minor but visible in the no-intent fallback state. |
| **Fix** | Copy only |

---

### 4.14 Place cards

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Work-fit signals, distance display, category badge, click-to-modal, PostHog tracking |
| **Gap** | None visible |

---

### 4.15 `PlaceModal`

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Stay-fit context chip (first work place), confidence signals, address/hours/ratings/Maps link when unlocked |
| **Minor gap** | "Truststay confidence notes" header is the brand name in a fairly prominent position inside the modal. Acceptable but could just say "What we know" or "Coverage notes." |
| **Fix** | Copy only, very low priority |

---

### 4.16 Footer / CTA language

| | |
|---|---|
| **Status** | Aligned |
| **What works** | "TrustStay — know your base before you arrive." is the exact right framing |
| **Gap** | None |

---

### 4.17 Locked vs unlocked states

| | |
|---|---|
| **Status** | Aligned |
| **What works** | Clear distinction: locked shows placeholder lines + item list + CTA; unlocked shows full narrative + plan around + support places |
| **Gap** | When `PaywallCard` shows (no intent, locked content, no `stayFit`), the locked item "Why your base fits and what to plan around" refers to a "base" that hasn't been computed yet — the user hasn't shaped their stay. The paywall is promising a base analysis that doesn't exist. |
| **Fix** | Copy: change "Why your base fits" to "Your personalized base recommendation" when no intent has been set — making it aspirational rather than falsely specific. Low effort. |

---

### 4.18 Multi-neighborhood city flow

| | |
|---|---|
| **Status** | Aligned |
| **What works** | BestBaseCard leads, grid below as exploration/confirmation, recommended badge, intent propagated through grid links |
| **Gap** | No deep-link from BestBaseCard base area name to the neighborhood detail page. User has to find the recommended area in the grid manually. |
| **Fix** | Implementation, small effort — `stayFit.baseArea` matching against curated neighborhood slugs |

---

### 4.19 Thin / early-coverage destination flow

| | |
|---|---|
| **Status** | Partially aligned |
| **What works** | `CoverageNotice` fires on partial/limited coverage; muted pill in browse grid; tooltip on hover |
| **Gap** | `IntentPrompt` and `BestBaseCard` both appear on thin cities (e.g. Gigante, Atins) without qualification. BestBaseCard is a confident-looking card even when based on 2–3 places. `RoutineSummaryCard` confidence note says "Limited data for this area" but BestBaseCard doesn't carry that qualification. |
| **Recommendation** | Add a low-confidence note inside BestBaseCard when `RoutineSummaryCard.confidence === "low"` — something like "Based on limited place data — treat this as a general orientation." |
| **Fix** | Implementation, small effort |

---

### 4.20 Metadata / SEO framing

| | |
|---|---|
| **Status** | Aligned |
| **What works** | All page type metadata updated; new framing is consistent across titles and descriptions |
| **Gap** | None |

---

## 5. User Journey Audit

### Journey A: Homepage search → intent → BestBase → grid/map → place detail

**Step by step:**
1. User lands on homepage. Reads H1: "Land in a new spot. Keep your routine from day one." — **❌ old framing, reactive**
2. Sees subtext: "find your base area, work spots, food, and wellbeing options before you arrive." — ✅ correct
3. Types city, selects from autocomplete → intent step appears inline — ✅
4. Selects "Surf + light work" → navigates to `city/puerto-escondido?purpose=surf&workStyle=light` — ✅
5. City page: "Your base map" header ✅, RoutineSummaryCard ("How functional is this base?") ✅, BestBaseCard locked with "La Punta" — ✅
6. User clicks "Unlock your base →" → Stripe → returns → BestBaseCard unlocked — ✅
7. LLM narrative: "La Punta is the active surf zone..." — ✅ if cache warm; deterministic fallback if not
8. "Plan around" — amber block (if red flag) + soft note — ✅
9. "Nearby that works for you" row: Selina / Cactus Garden — ✅ but **no link to La Punta neighborhood page**
10. Scrolls to Work section → first place has context chip in modal ✅
11. Map: "Your base for surf + light work — La Punta" popup ✅

**What breaks:** Step 1 headline. Step 9 missing deep-link.  
**Old TrustStay shows through:** Only in the H1.

---

### Journey B: Browse activity → city with prefilled intent → BestBase

**Step by step:**
1. User sees "Surf" category → picks "Puerto Escondido" pill → navigates with `?purpose=surf&workStyle=light` — ✅
2. City page loads with intent → `IntentPrompt` is suppressed → BestBaseCard immediately active — ✅
3. BestBaseCard: "For surf + light work · Change" — ✅
4. Grid below: "Explore other areas" — ✅
5. La Punta card has "Recommended for your stay" badge — ✅ (if `recommendedAreaName` matches)

**What works:** Almost everything. Intent pre-fill is seamless.  
**What breaks:** Nothing significant.  
**Old TrustStay shows through:** Only if user bounces back to homepage (H1).

---

### Journey C: Direct / SEO / shared link without intent

**Step by step:**
1. User hits `city/puerto-escondido` with no `?purpose=`
2. Map: "Routine map" — **⚠️ minor old framing, neutral but not aligned**
3. RoutineSummaryCard + RecommendedAreaCard ("Suggested base area" / "A useful starting point...") — **⚠️ hedgy copy**
4. IntentPrompt: "Shape this stay / What kind of stay are you planning in Puerto Escondido?" — ✅
5. User selects surf + light → URL updates → BestBaseCard appears — ✅
6. OR user skips → sees generic place sections → PaywallCard at bottom with "Why your base fits" — **❌ refers to a base that hasn't been determined**

**What breaks:** PaywallCard "why your base fits" item when no base has been computed.  
**Old TrustStay shows through:** "Routine map", "Suggested base area" fallback label, PaywallCard with unqualified "base" reference.

---

### Journey D: Thin / early-coverage destination (e.g. Gigante, Nicaragua)

**Step by step:**
1. User sees muted "Gigante" pill with "·" indicator — ✅ (tooltip: "Early coverage — some sections may be limited")
2. Clicks → `city/gigante?purpose=surf&workStyle=light`
3. CoverageNotice: "Limited data for Gigante — we found [N] places. Coverage may be thin." — ✅
4. RoutineSummaryCard shows "Limited data for this area — treat this as an early signal, not a final answer." — ✅
5. BestBaseCard renders with "Centro" or geocoded area name — **⚠️ looks confident but based on 2–3 places**
6. BestBaseCard unlocked state: deterministic "why it fits" — 2 cafés found — ✅ honest but thin

**What breaks:** BestBaseCard has the same visual weight for 3 places as for 30.  
**Fix:** BestBaseCard should echo the coverage confidence when `RoutineSummaryCard.confidence === "low"`.

---

### Journey E: Unlocked user going deeper

**Step by step:**
1. BestBaseCard unlocked — full narrative — ✅
2. Scrolls to Work section — first place context chip ("✦ For surf + light work: closest work option near La Punta") — ✅
3. Clicks first place → PlaceModal opens — context chip in teal chip at top — ✅
4. Other work places — no context chip — ✅ (only first place is annotated, correct)
5. Clicks through to La Punta neighborhood page (via grid card) — full neighborhood data with intent params — ✅
6. On neighborhood page: RoutineSummaryCard + RecommendedAreaCard (no BestBaseCard on neighborhood pages) — ⚠️ slight inconsistency

**What breaks:** Minor gap — the neighborhood page doesn't have the personalized BestBase framing once you land there; it reverts to the generic RoutineSummaryCard layout.  
**Old TrustStay shows through:** Neighborhood page feels slightly like the old product because BestBase context (the "why") isn't carried there.

---

## 6. Top 10 Fixes by Leverage

Ordered by impact vs effort.

| # | Fix | Type | Files | Effort | Impact |
|---|---|---|---|---|---|
| 1 | Change H1: "Land in a new spot. Keep your routine from day one." → preparation framing | Copy | `src/app/page.tsx` | 5 min | Critical |
| 2 | Change search button: "Map my routine" → "Find my base" | Copy | `src/components/CitySearch.tsx` line 371 | 2 min | Critical |
| 3 | BestBaseCard → neighborhood deep-link in unlocked state | Implementation | `src/components/BestBaseCard.tsx` | 1–2 h | High |
| 4 | PaywallCard locked item "Why your base fits" — only meaningful with intent | Copy | `src/components/PaywallCard.tsx` | 10 min | Medium |
| 5 | BestBaseCard low-confidence note on thin cities | Implementation | `src/components/BestBaseCard.tsx`, `src/app/city/[slug]/page.tsx` | 1 h | Medium |
| 6 | Map fallback label: "Routine map" → "Place overview" | Copy | `src/components/CityMap.tsx` | 2 min | Low |
| 7 | RecommendedAreaCard body copy — remove hedge | Copy | `src/components/RecommendedAreaCard.tsx` | 5 min | Low |
| 8 | Early-coverage tooltip — mention limited recommendation accuracy | Copy | `src/components/DestinationPill.tsx` | 5 min | Low |
| 9 | Neighborhood page intent carry-through — add intent context on neighborhood detail page | Implementation | `src/app/city/[slug]/page.tsx` (neighborhood path) | 2–4 h | Low |
| 10 | BUNDLE_FEATURES copy — "every area" → "prepared for any neighborhood" | Copy | `src/app/page.tsx` | 5 min | Low |

---

## 7. Copy-Only Fixes

All of these are single-string changes. None require architectural decisions.

```
src/app/page.tsx
  H1: "Land in a new spot. Keep your routine from day one."
  → Suggested: "You chose the place. Know where to land."
    or: "Know your base before you arrive."
    
  BUNDLE_FEATURES[0]: "Full setup for every area in the city"
  → Suggested: "Prepared for any neighborhood in the city"

src/components/CitySearch.tsx
  Button: "Map my routine"
  → Suggested: "Find my base" or "Get my setup"

src/components/CityMap.tsx
  Fallback header: "Routine map"
  → Suggested: "Place overview"

src/components/RecommendedAreaCard.tsx
  Fallback reason: "This is where work spots, gyms, and food options seem to cluster. 
    A useful starting point — not a precise neighborhood boundary."
  → Suggested: "This is where work and daily-life options cluster most. 
    Start here, adjust once you know the area."

src/components/PaywallCard.tsx
  Locked item: "Why your base fits and what to plan around"
  → When no intent: "Your personalized base recommendation — why it fits and what to plan around"
  (Or: only show this item when intent is set — implementation change)
```

---

## 8. Implementation Fixes

Each requires a code change beyond copy.

### 8.1 BestBaseCard → neighborhood deep-link

In the unlocked state, when `stayFit.baseArea` matches a known neighborhood name for the city, add a subtle link: "View full setup for [Base Area] →". This requires looking up the neighborhood slug from `stayFit.baseArea` — either via the curated neighborhood configs or via the KV narrative's `baseAreaName`.

**Files:** `src/components/BestBaseCard.tsx`, `src/lib/kv.ts` (or pass `baseNeighborhoodSlug` as prop from `city/[slug]/page.tsx`)

### 8.2 BestBaseCard low-confidence disclosure

When `summary.confidence === "low"`, pass a `lowConfidence` flag to `BestBaseCard` and render a note: "Based on limited place data for this destination — treat this as a general orientation, not a precise recommendation."

**Files:** `src/components/BestBaseCard.tsx`, `src/app/city/[slug]/page.tsx`

### 8.3 PaywallCard intent-awareness

`PaywallCard` should receive an `hasIntent: boolean` prop. When `false`, the locked item "Why your base fits and what to plan around" should be reworded to "Your personalized base recommendation and what to plan around" to avoid implying a specific base has been determined.

**Files:** `src/components/PaywallCard.tsx`, `src/app/city/[slug]/page.tsx`

---

## 9. Product-Logic Fixes

Deeper structural questions, not immediate.

### 9.1 City unlock vs neighborhood unlock model

Currently: a user can unlock a single city pass (e.g. `city/puerto-escondido`) or a bundle. If BestBaseCard recommends "La Punta" and the user unlocks the city, the La Punta neighborhood page is still locked when they click through via the grid. This creates a broken expectation: BestBaseCard says "La Punta is your base" but when the user navigates there for more detail, they hit another paywall.

**Proposed resolution:** The city-level unlock should propagate to the recommended neighborhood. Pass the unlock token through the neighborhood link on the grid, or bundle the neighborhood unlock with the city-level unlock when BestBaseCard is active.

### 9.2 BestBaseCard on multi-neighborhood cities vs neighborhood-level pages

On `city/puerto-escondido?purpose=surf&workStyle=light`, BestBaseCard computes across the full city dataset and recommends "La Punta." When the user navigates to `city/la-punta?purpose=surf&workStyle=light`, the neighborhood page computes `stayFit` for just La Punta's places — which should produce a stronger score and more specific narrative. This is correct product behavior, but the user doesn't know this: from the outside it looks like they're getting the same analysis twice.

The neighborhood page's `BestBaseCard` equivalent (currently just `RoutineSummaryCard` + `RecommendedAreaCard`) should be framed as "You're looking at your recommended base" rather than a neutral generic area summary.

---

## 10. Final Verdict

**Is the UI now telling one coherent story?**

**Mostly yes. The story is 90% coherent.**

The product correctly answers: "Where should I base myself in [City] for [kind of stay]?" The entry flow is complete. The recommendation moment (BestBaseCard) is the clear central product moment. The map, grid, and place detail all support it. The LLM layer is correctly bounded. The copy across paywall, how-it-works, and pricing is aligned.

**The remaining incoherence is concentrated in exactly two strings:**

1. `"Land in a new spot. Keep your routine from day one."` — the H1 of the homepage
2. `"Map my routine"` — the action button on the homepage

Both of these are on the page that every user sees first. Both take 2 minutes to fix. They are the most important copy changes remaining in the product.

**After fixing those two strings, the product tells one coherent story from homepage to place detail.**

Everything else is a refinement, not a correction.
