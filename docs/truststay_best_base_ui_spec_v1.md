# TrustStay — Best Base Unlock: UI Spec v1

**Status:** Ready to implement  
**Depends on:** `computeStayFitScore`, `StayFitResult`, `appendDailyLifeSignals`, daily-life map pins  
**Does not require:** LLM, chat, reviews  

---

## 1. Section placement on city page

```
City page layout (current + new):

  ┌──────────────────────────────────┐
  │  Header                          │
  │  City name + subtitle            │
  │  CityIntro (if available)        │
  │                                  │
  │  [Routine map — CityMap]         │  ← existing
  │                                  │
  │  [RoutineSummaryCard]            │  ← existing (score + area)
  │  [RecommendedAreaCard]           │  ← existing (algorithmic base)
  │                                  │
  │  ┌────────────────────────────┐  │
  │  │  ★ BEST BASE CARD (NEW)   │  │  ← insert here
  │  └────────────────────────────┘  │
  │                                  │
  │  [Work section]                  │  ← existing
  │  [Coffee & meals section]        │  ← existing
  │  [Wellbeing section]             │  ← existing
  │  [PaywallCard — if not unlocked] │  ← existing
  └──────────────────────────────────┘
```

**Why between the score cards and place sections:**

- User has just seen the map (spatial context) and the score (signal that something is here)
- The Best Base card answers the natural next question: *"Okay, but where exactly should I stay?"*
- Placing it before the place sections means it leads; the places support it
- Placing it after the existing `RecommendedAreaCard` allows a clean visual handoff: score → area → why + fit

**Render condition:** Always render if `baseCentroid` exists (i.e. enough place data). Hide if fewer than 5 places — the `RecommendedAreaCard` handles the low-data fallback.

---

## 2. Component structure

```
src/components/BestBaseCard.tsx     ← new server component
```

### Props:

```typescript
interface BestBaseCardProps {
  isUnlocked: boolean;
  cityName: string;
  citySlug: string;
  baseArea: string;                    // from summary.recommendedArea
  stayFit: StayFitResult | null;       // null → no intent, show generic locked state
  intent: StayIntent | null;
}
```

### Internal structure:

```
BestBaseCard
├── FreeBaseHeader       — area name + score chips (always visible)
├── LockedBaseBody       — shown when !isUnlocked
│   ├── WhyPlaceholder   — frosted placeholder lines (not a blur)
│   └── UnlockCTA        — "Unlock your base →"
└── UnlockedBaseBody     — shown when isUnlocked
    ├── WhyItFits        — templated or LLM paragraph
    ├── TradeoffList     — 2 items max
    ├── RedFlagRow       — 1 item, only if stayFit.redFlags.length > 0
    ├── SupportPlaces    — 2 compact place rows
    └── ScoreBreakdown   — work / life chips with numbers
```

---

## 3. Free state

What every user sees, regardless of intent or unlock status.

### Visual spec:

```
┌──────────────────────────────────────────────────────┐
│  Suggested base area                                 │  ← label: text-xs uppercase tracking text-umber
│                                                      │
│  La Punta                            Routine: 58    │  ← h2 text-2xl font-semibold text-bark
│                                                      │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← placeholder    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← placeholder            │
│                                                      │
│  Your stay-fit analysis is ready.                    │  ← text-sm text-umber
│                                                      │
│  [Unlock your base →]                                │  ← button, bark bg, white text
└──────────────────────────────────────────────────────┘
```

### Key design rules:

- **Area name is always visible** — the user deserves to know the name exists; it builds trust
- **Placeholder lines are NOT blurred text** — use `rounded bg-dune/60` div blocks with randomized widths (85%, 65%) to suggest paragraph structure without showing fake content
- **Routine score is visible** as a plain number chip — shows there's a real score, not just UI
- **Work fit and daily-life scores are dashes** (`—`) in free state — their labels appear but values are redacted
- **No fake "blurred" numbers** like "?? / 100" — that's cheap. Just `—`
- **One hint sentence** — calm, not pushy: *"Your stay-fit analysis is ready."* No exclamation marks, no "unlock now"

### When `intent` is null (no URL params):

Free state shows a slightly different hint:

> *"Tell us how you want to work here to get a personalized base recommendation."*

This seeds the "Shape this stay" module (milestone 2) without blocking anything.

---

## 4. Locked state

Same as free state but with intent present — the user has given purpose + workStyle.

The placeholder lines change to show the profile label:

> *"Your base analysis for **surf + light work** is ready."*

This personalizes the lock — the user knows we actually computed something for them specifically, not a generic recommendation.

---

## 5. Unlocked state

Full card revealed. No animation required — just renders the full content.

### Visual spec:

```
┌──────────────────────────────────────────────────────┐
│  Your base in Puerto Escondido                       │  ← label
│                                                      │
│  La Punta                                            │  ← h2 text-2xl font-semibold
│                                                      │
│  Work 48 · Daily life 32                             │  ← score chips (text-xs badges)
│                                                      │
│  ─────────────────────────────────────────           │
│                                                      │
│  "Close to the main surf access and the only         │  ← WhyItFits: text-sm leading-6 text-umber
│   coworking in town. Walk to your morning session,   │    max-w-prose
│   work mid-day. Groceries are a 10-min scooter       │
│   ride — build that into your routine."              │
│                                                      │
│  ─────────────────────────────────────────           │
│                                                      │
│  Plan around                                         │  ← section label text-xs uppercase
│  · Café wifi unverified — bring a backup SIM         │  ← TradeoffList: text-sm text-umber
│  · Quiet until 6pm, louder near the break evenings   │
│                                                      │
│  ⚠  No grocery within walking distance              │  ← RedFlagRow: amber bg, text-amber-800
│                                                      │
│  ─────────────────────────────────────────           │
│                                                      │
│  Nearby that works for you                           │  ← section label
│  ☕  Café Pakal    0.3 km  →  [scroll to card]       │  ← SupportPlace row
│  🛒  Chedraui Express    1.8 km                      │  ← SupportPlace row
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Tailwind classes reference:

```tsx
// Card shell
<div className="rounded-2xl border border-dune bg-white p-6 shadow-sm">

// Label
<p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">

// Area name
<h2 className="mt-2 text-2xl font-semibold tracking-tight text-bark">

// Score chips
<div className="mt-2 flex gap-2">
  <span className="inline-flex items-center rounded border border-dune bg-cream px-2 py-0.5 text-xs">
    Work <span className="ml-1 font-semibold text-bark">{workFit}</span>
  </span>
  <span className="inline-flex items-center rounded border border-dune bg-cream px-2 py-0.5 text-xs">
    Daily life <span className="ml-1 font-semibold text-bark">{dailyLifeFit}</span>
  </span>
</div>

// Why it fits
<p className="mt-4 text-sm leading-6 text-umber max-w-prose">

// Section label
<p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-umber">

// Tradeoff item
<li className="text-sm text-umber leading-6">

// Red flag row
<div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
  <span className="text-amber-600 text-sm">⚠</span>
  <p className="text-sm text-amber-800">{redFlag}</p>
</div>

// Support place row
<div className="flex items-center justify-between gap-3 text-sm">
  <span className="text-umber">{icon} {name}</span>
  <span className="text-xs text-umber/60">{distance} km</span>
</div>
```

---

## 6. Map behavior

### Free state:

- Base area pin: same as today — dark bark teardrop with house icon
- Popup: *"Suggested base — [City Name]"*
- Daily-life pins: hidden
- Legend: Work, Coffee & meals, Wellbeing, Locked

### Unlocked state:

- Base area pin: same visual, but popup updates to: *"Your base · [Area Name]"*
- The 2 support places from the BestBaseCard get a subtle visual call-out: their popup adds a line *"Recommended for your base"* — no visual change to the pin itself (avoids confusion)
- Daily-life pins appear: sage green basket (grocery), dusty rose cross (pharmacy)
- Legend gains: Grocery, Pharmacy entries (only when data exists)
- Zoom: unchanged from free state — no jarring re-center on unlock

### What the map does NOT do:

- Does not draw a polygon or circle around the base area — too much visual noise for v1
- Does not add a new layer or any Mapbox source changes — just more markers
- Does not re-center on unlock — continuity matters

### How map reinforces the recommendation:

The recommendation card names La Punta. The base pin is sitting at La Punta's cluster centroid. The user looks from card → map → pin and thinks: *"I can see exactly where this is."* That spatial confirmation is the trust moment.

The 2 support places in the card are pinned on the map — the user can see Café Pakal 300m from the base pin and the grocery 1.8km away. The map makes the tradeoff visible: close work, far groceries. The card said it; the map shows it.

---

## 7. Mobile behavior

### Stack order on mobile:

Same as desktop but fully single-column.

```
Map (full width, height: clamp(240px, 50vw, 340px))
↓
RoutineSummaryCard
↓
RecommendedAreaCard
↓
BestBaseCard  ← full width, vertical layout
  Area name (large)
  Score chips (inline)
  [Locked placeholder OR full content]
  CTA button (full width on mobile)
↓
Place sections
```

### Mobile-specific rules:

- CTA button: `w-full` on mobile, `w-auto` on sm+
- Score chips: wrap gracefully if needed — `flex-wrap`
- WhyItFits paragraph: full width, no max-w-prose constraint on mobile
- Tradeoff list: no columns — single column always
- SupportPlace rows: distance right-aligned, truncate place name at 24 chars

### Touch interaction:

- The support place rows are tappable and scroll to the corresponding place card below
- No other interactive elements in the card

---

## 8. Example scenarios

### Example 1: Popoyo, Nicaragua — surf + light work

**Context:** Popoyo is a small surf village. OSM data is sparse. 1–2 cafés, no coworking, no grocery within 1.5km.

**Free state shows:**
- "Suggested base area: Popoyo"
- Routine: 18
- Placeholder lines
- "Your stay-fit analysis for surf + light work is ready."

**Unlocked state shows:**

> *Area:* **Popoyo**  
> *Work 22 · Daily life 8*

> "The surf access is the product here — your work setup will be café-based and limited. One café with passable wifi sits near the beach. Plan your deep work sessions in the mornings before wind picks up."

> *Plan around*  
> · Only one work-capable café — no backup if it's full  
> · No grocery nearby — Rivas is the nearest town for weekly shopping

> ⚠ No grocery or pharmacy within 2km — daily logistics require a scooter or regular transport.

> *Nearby that works for you*  
> ☕ Café [Name] · 0.4 km  
> 🛒 [Nearest grocery] · 4.2 km

**Why this works:** The score is low — and that's honest. The recommendation isn't "Popoyo is great for work." It's "here's what you're getting and what to plan around." A user with surf as their primary purpose and work as secondary sees this as exactly the truth — they chose Popoyo for the surf, not the work infrastructure. TrustStay confirms they made an informed tradeoff.

---

### Example 2: Antigua, Guatemala — hike + balanced work

**Context:** Antigua is a colonial city with decent remote-work infrastructure. 3–4 coworkings, multiple cafés, grocery + pharmacy nearby, close to hiking routes.

**Free state shows:**
- "Suggested base area: Central Antigua"
- Routine: 71
- Placeholder lines
- "Your stay-fit analysis for hike + balanced work is ready."

**Unlocked state shows:**

> *Area:* **Central Antigua**  
> *Work 65 · Daily life 78*

> "A strong base for a balanced month. Multiple coworkings within walking distance, groceries and pharmacies in the central market area. Day trips to Acatenango and Pacaya are well-organized from here — factor in early starts on hike days."

> *Plan around*  
> · Wifi at coworkings verified; café wifi varies  
> · Noise in the central area on weekends — morning focus works better

> *Nearby that works for you*  
> 🏢 [Coworking Name] · 0.6 km  
> 🛒 [Mercado] · 0.3 km

**Why this works:** The score is honest (65 and 78 — good but not perfect). The "why" references the hiking context (Acatenango) because the profile is `activity_balanced_work`. It's specific to the user's intent, not a generic Antigua description.

---

### Example 3: El Tunco, El Salvador — surf + heavy work

**Context:** El Tunco is a surf-focused beach town. Good surf scene, limited infrastructure. A user with `work_primary` profile asking about El Tunco gets an honest — almost cautionary — recommendation.

**Free state shows:**
- "Suggested base area: El Tunco"
- Routine: 28
- Placeholder lines
- "Your stay-fit analysis for surf + heavy work is ready."

**Unlocked state shows:**

> *Area:* **El Tunco**  
> *Work 19 · Daily life 24*

> "El Tunco is a surf-first village. For heavy work needs, the infrastructure here will create friction — no dedicated coworking, café wifi is unreliable. If work is your priority, consider San Salvador (40 min) for focused weeks and El Tunco as a weekend base."

> *Plan around*  
> · No coworking — you'll depend on café wifi entirely  
> · No verified wifi across work spots — test before committing to a full day

> ⚠ No dedicated coworking found — heavy work sessions will require planning and backup options.

> *Nearby that works for you*  
> ☕ [Best café] · 0.5 km  
> 🛒 [Nearest grocery] · 2.1 km

**Why this works:** This is the most important example. The recommendation doesn't say "don't go." It says: *here's what you're getting, and here's a smarter framing of how to use it.* The suggestion to use San Salvador as a work hub is honest and useful — it reframes the destination without dismissing it. A user with `work_primary` and El Tunco in mind needs this exact clarity before they book.

---

## Implementation notes for developers

### "Why it fits" before LLM (milestone 1)

In v1, the paragraph is templated from `stayFit.narrativeInputs`:

```typescript
function buildWhyItFitsTemplate(inputs: StayFitResult["narrativeInputs"]): string {
  const { workInfrastructureSummary, dailyLifeSummary, activeRedFlags, baseAreaName } = inputs;

  const workSentence = workInfrastructureSummary
    ? `Work setup: ${workInfrastructureSummary}.`
    : "Work infrastructure is limited here.";

  const lifeSentence = dailyLifeSummary
    ? `Daily life: ${dailyLifeSummary}.`
    : "Daily logistics will require planning.";

  const flagHint = activeRedFlags.length > 0
    ? ` Factor in: ${activeRedFlags[0].toLowerCase()}`
    : "";

  return `${workSentence} ${lifeSentence}${flagHint}`;
}
```

This reads like data, not copy — which is fine for v1. It tells the user real information grounded in real place data. The LLM layer (milestone 3) turns this into a natural paragraph that sounds like an experienced traveler wrote it.

### Tradeoffs (milestone 1)

In v1, tradeoffs are deterministic and come directly from `stayFit.redFlags` (split into max 2). They are not generated — they are real data conditions. This is a feature, not a limitation.

### Support places

The 2 support places come from:
1. `stayFit.topWorkPlaces[0]` — best work spot for this profile
2. `stayFit.topDailyLifePlaces[0]` — nearest grocery or pharmacy

Both are already in `StayFitResult` — no additional fetch required.

### Scroll-link behavior

Each support place row should `scrollIntoView` to its corresponding place card:

```typescript
document.getElementById(`place-${placeId}`)
  ?.scrollIntoView({ behavior: "smooth", block: "center" });
```

This is already used in `CityMap` for the same purpose.
