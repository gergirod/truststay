# TrustStay — Copy Alignment v1

**Core product promise (all copy should reinforce this):**
> TrustStay helps remote workers prepare for the place they already chose.

**The language to protect:**
- Best base / your base
- Why this fits
- What to plan around
- Nearby that works for you
- Arrive prepared / before you arrive
- Your kind of stay

**The language to eliminate:**
- City Pass / Neighborhood Pass / City Bundle
- Full place lists / unlock more places
- Explore freely / browse destinations / discover
- Ratings, hours, and Maps links (as feature bullets)
- Directory-style locked items ("place names and exact locations")

---

## 1. PaywallCard

### What it currently says (wrong)

```
[Overline] City Pass — Puerto Escondido
[H2]       See exactly what and where
[Body]     You can see how many places are near your base and how well they fit.
           Unlock to get the names, ratings, hours, and Maps links for every one.
[Locked items]
  • Place names and exact locations
  • Ratings and review counts from Google
  • Opening hours and open/closed status
  • Wi-Fi confidence and noise signals
  • Direct Google Maps links
[CTA]      Unlock Puerto Escondido setup — $5
```

### What it should say

```
[Overline] Your stay setup — Puerto Escondido
[H2]       Everything you need before you arrive
[Body]     You can see how the base area looks and which places exist.
           Unlock to get the full picture for your kind of stay.

[Locked items — benefit-led, not feature-led]
  • Why your base fits and what to plan around
  • Every work spot and café within walking distance
  • Daily essentials — grocery, pharmacy — by distance from base
  • Hours, ratings, and Maps links for each place
  • Honest signals: wifi quality, noise level, work fit

[CTA]      Get your full setup — $5
[Sub-CTA]  One-time · No account needed · Instant access
```

**Notes for implementation:**
- Remove "City Pass" as a product name from this component entirely. It appears nowhere useful.
- The `hookLine` prop (currently things like "Includes dedicated coworking spaces with verified hours") is good — keep this. It's specific and benefit-led.
- The bundle CTA copy can stay close to current but change "Unlock all neighborhoods" → "Get the full [City] setup — all areas".

---

## 2. Landing page — Pricing section

### What it currently says (wrong)

**Free tier features:**
- Neighborhood grid for major cities
- Routine score and suggested base area
- Top picks per category (work, coffee, training)

**Neighborhood Pass features:**
- Full place lists for one neighborhood
- Ratings, hours, and Maps links
- Confidence breakdown per place

**City Bundle features:**
- All neighborhoods in one spot unlocked
- Everything in the Neighborhood Pass
- One payment — explore freely

### What it should say

**Tier names:**
- Free → `Free`
- Neighborhood Pass → `Stay Setup`
- City Bundle → `Full City Setup`

**Free tier features (rewritten):**
- Recommended base area for your destination
- Routine score and coverage summary
- One work spot, café, and training option near your base

**Stay Setup features (rewritten):**
- Your full base recommendation — why it fits, what to plan around
- Every work spot, café, and wellbeing option sorted by distance
- Hours, ratings, and Maps links for each place
- Honest wifi, noise, and work-fit signals

**Full City Setup features (rewritten):**
- Full setup for every neighborhood in the city
- Best base recommendation across all areas
- One payment — arrive prepared for any part of the city

**Pricing section header:**

Current: `Pricing` (dry, no story)

Replace with:
```
[Overline] What's included
[H2]       Start free. Unlock your full setup when you're ready.
```

---

## 3. Landing page — HOW IT WORKS section

### What it currently says (wrong)

```
01. Search any spot
    Enter any city, surf town, or activity destination where you plan to spend time.

02. Get a recommended area
    We analyze work spots, gyms, and food options to suggest a practical base area.

03. Read honest confidence signals
    Every place shows what we know and what we don't — no fake certainty.
```

**What's wrong:** Step 01 frames this as destination discovery ("any spot", "where you plan to spend time"). Step 03 leads with methodology, not user benefit.

### What it should say

```
01. Tell us where you're going and how you work
    Enter your destination and shape your stay — surf + light work, focused remote,
    whatever your rhythm is. No account required.

02. Get your base recommendation
    TrustStay finds the best area for your kind of stay — with honest signals
    on work infrastructure, daily life, and what to plan around before you arrive.

03. Arrive knowing your setup
    Every work spot, café, and grocery ranked by distance from your base.
    No guessing, no day-one scrambling, no wasted first week.
```

---

## 4. Landing page — Browse destinations section

### What it currently says (wrong)

```
[Overline] Browse destinations
[Body]     170+ spots across Latin America and the Caribbean — filter by region or activity.
```

This is 100% discovery language. It sends the message: "use this product to find somewhere to go."

### What it should say

```
[Overline] Already know where you're going?
[Body]     Browse by purpose — surf, dive, hike, yoga, or remote work hub.
           Pick your spot and see where to base yourself.
```

**Optional stronger version (more opinionated):**

```
[Overline] Where remote workers actually stay
[Body]     170+ destinations across Latin America and the Caribbean.
           Pick yours — we'll show you where to base yourself and what to plan around.
```

**Notes for implementation:**
- This section does not need a structural change, only the overline and intro text.
- Longer term, destination cards could link directly with intent pre-set (e.g., Puerto Escondido card links to `/city/puerto-escondido?purpose=surf&workStyle=light`). But that's a future milestone.
- The category label "Remote work hubs" is accurate and fine — keep it.

---

## 5. RoutineSummaryCard

### What it currently says (wrong)

```
[Overline] Routine score
[Score]    73 / 100
[Body]     {summaryText — algorithmic description}
[Note]     Based on strong data coverage.
```

**What's wrong:** "Routine score" is abstract and disconnected from any user question. The number out of 100 reads as a data product metric, not a preparation signal. Users who arrive without intent (the majority via homepage search) see this card first — it's their primary impression of what TrustStay does.

### What it should say

**Option A — keep the number, change the label:**
```
[Overline] Stay infrastructure
[Score]    73 / 100
[Body]     {summaryText unchanged}
[Note]     Based on strong data coverage.
```

**Option B — drop the number, use a qualitative tier:**
```
[Overline] Base quality
[Tier]     Strong · Work, food, and daily essentials well covered
[Body]     {summaryText}
[Note]     Based on strong data coverage.
```

**Option C — contextual framing (recommended):**
```
[Overline] How functional is this base?
[Score]    73 / 100
[Body]     {summaryText}
[Note]     Based on strong data coverage.
```

**Recommendation: Option C.** "How functional is this base?" directly answers a user question and connects to the preparation narrative. It doesn't require removing the score (which is useful signal) — just reframes what it's measuring.

**Confidence note changes:**
- `"Based on limited data — score may not reflect reality."` → `"Limited data for this area — treat this as an early signal, not a final answer."`
- `"Based on moderate data coverage."` → `"Moderate data coverage — most key places are likely accounted for."`
- `"Based on strong data coverage."` → remove entirely, or replace with `"Strong data coverage."` (positive framing).

---

## 6. City page — CTA labels and section labels

### Area setup overline (neighborhood page)

Current: `Area setup`
Keep: this is fine — "area setup" is functional and preparation-oriented. ✓

### City setup overline (city-level page)

Current: `City setup`
Keep: acceptable. ✓

### Neighborhood grid overline (default, no intent)

Current: `Choose your base`
This is fine as a framing when the grid IS the primary decision layer.
But the subtitle that follows should be softened:

Current subtitle: `"Pick a neighborhood to see work spots, coffee and meal options, and training places — organized around a suggested base area."`

Replace with: `"Pick an area — we'll show you where to base yourself, what fits your work style, and what to plan around."`

### Neighborhood card link text

Current: `View setup`
Keep: "View setup" is well-aligned. ✓

### BestBaseCard locked CTA

Current: `Unlock your base →`
Keep: strongest CTA in the product. ✓

### BestBaseCard locked body

Current:
> "Your base analysis for **surf + light work** is ready — why this area fits, what to plan around, and what nearby support makes it work."

Keep: this is well-written. ✓

### PlaceSection empty state messages

Current (examples):
- `"No strong work spots found near this base yet."`
- `"No clear coffee or meal spots found near this base yet."`

These are fine — honest and preparation-oriented. ✓

### Footer

Current: `"Truststay — built for remote workers who need to get functional fast."`

Replace with: `"TrustStay — know your base before you arrive."`

Or keep close to current but tighten: `"TrustStay — get functional from day one."`

The current footer is fine but "get functional fast" sounds like a sprint/hackathon product. The new promise is calmer and more confident.

---

## Summary — change priority

| Surface | Change type | Priority |
|---|---|---|
| PaywallCard | Rewrite body, overline, locked items | Highest |
| Landing pricing features | Rewrite tier names + feature bullets | High |
| HOW IT WORKS | Rewrite all 3 steps | High |
| Browse destinations overline | 2-line copy change | Medium |
| RoutineSummaryCard overline | 1-line copy change | Medium |
| Neighborhood grid subtitle (no-intent) | 1-line copy change | Medium |
| Footer | 1-line copy change | Low |

The PaywallCard is the highest priority because it's the last thing a user reads before deciding to pay. If that copy still sounds like a directory unlock ("place names and exact locations"), it undermines everything BestBaseCard just said.
