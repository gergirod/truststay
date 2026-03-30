# TrustStay — Intent Flow & Loading Experience v2

> Grounded in the actual current implementation of `CitySearch.tsx`, `IntentPrompt.tsx`, and `scoring.ts`.  
> Opinionated design spec — one recommendation per section.

---

## 1. What is Wrong With the Current UI

### The core problem: vertical expansion destroys the hero

In `CitySearch.tsx`, the intent step replaces the search form with a card that:

1. Renders a header + 7 purpose pills (flex-wrap — spills to 2–3 rows on any screen narrower than ~620px)
2. When purpose is selected, appends a `border-t` separator + 3 work-style cards below

The total height of the intent card in its fully expanded state is approximately **360–420px** depending on screen width. The hero glass card that contains the search form (`max-w-[640px]`, `rounded-3xl`) was designed around a compact search input (~80px). When the intent step fires, the glass card grows by 280–340px, pushing everything below, cracking the hero/map composition, and making the screen feel like a form rather than a premium product.

**The IntentPrompt on the city page has the same problem.** It renders below the map and above the place sections. At full expansion (7 purpose pills + work style), it is a ~380px card that visually competes with the map in weight. The map + RoutineSummaryCard + IntentPrompt stack can push BestBaseCard 700+ pixels below the fold before the user has done anything.

### What product feeling this creates now

1. **Quiz feel.** Two sequential questions with a visible expand animation creates a mental model of "a form to fill in" rather than "a product shaping itself." Premium tools shape around the user; quiz tools ask the user to fill in fields.

2. **Friction before payoff.** The user has to complete the intent step before seeing any content. If they are arriving from Browse (intent pre-filled), this never fires — which is correct. But if they arrive cold, the first thing they see on the city page is a large form above all city content.

3. **Mismatch with the map background.** The hero is designed as a premium product moment — full-bleed map, glass card floating above. The intent expansion visually dominates and overwrites that premium feeling. The map becomes a backdrop for a quiz.

4. **Purpose pills are doing too much work.** 7 emoji pills (surf, dive, hike, yoga, kite, work first, exploring) are presented as a horizontal flex-wrap that wraps unpredictably. On a 640px card they might fit in two rows; on a 400px mobile screen they span three. The layout is not stable.

### What specifically should change

- The intent form must have a **fixed, predictable height** — it should not grow when the second question appears.
- Purpose pills need to fit in **one or two compact rows** — not flex-wrap spaghetti.
- The work question and any additional question must live **in the same visual space** as the purpose question, not appended below it.
- On the city page, the IntentPrompt should feel **lighter than the map**, not heavier.

---

## 2. Recommended Compact Intent Flow

### Why three inputs are the right ceiling

The current model uses `purpose` + `workStyle`. The `vibe` field (`VibePreference: "social" | "local" | "quiet"`) exists in `StayIntent` but is never read by `resolveProfile()` or the scoring engine — it has zero effect on output. It is dead code.

The v2 model keeps exactly three inputs:

1. **Purpose** — what draws you here (surf, hike, yoga, etc.)
2. **Work intensity** — how many hours you work per day
3. **Daily balance** — what shapes your base choice: activity-first or work-first

These three dimensions together solve a real gap in the current model:

**The gap:** `resolveProfile()` currently maps `activity + heavy workStyle` → `work_primary`. But a surfer who works 6 hours a day is NOT primarily a "work person." Their base should be chosen for surf proximity + adequate work coverage — not for maximum coworking density. The current model gets this wrong for heavy-work activity users.

**Daily balance fixes this.** It decouples "how many hours do you work" from "what should determine your base location." A surfer who says "purpose-first" with heavy work gets a base near the surf with good work coverage nearby — not a base optimized for coworkings.

---

### A. Homepage search flow

**Entry point:** user has typed a city and selected from autocomplete → intent step fires.

**What is already known:** the city. Nothing about intent.

**What to ask:** all three inputs — purpose, work intensity, daily balance.

**Pattern:** fixed-height 2-panel card. Not a sequential expand. Both questions visible simultaneously after purpose is selected.

**Step layout:**

```
┌─────────────────────────────────────────────────────┐
│ [teal bar]                                           │
│                                                      │
│  Puerto Escondido                         [← back]  │
│  What kind of stay are you planning?                 │
│                                                      │
│  Purpose row (7 pills in 2 rows, compact)            │
│  🏄 Surf  🤿 Dive  🥾 Hike  🧘 Yoga  🪁 Kite         │
│  💻 Work  🗺️ Exploring                               │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  How heavy is your workload?    [Q2, always visible] │
│  [ Light ]  [ Balanced ]  [ Heavy ]                  │
│                                                      │
│  What shapes your base?         [Q3, always visible] │
│  [ Purpose-first ]  [ Balanced ]  [ Work-first ]     │
│                                                      │
│                    Skip — show me the city           │
└─────────────────────────────────────────────────────┘
```

**Key behavior:** Q2 and Q3 are visible immediately — they are not revealed progressively. They are grayed out/disabled until purpose is selected, then become active. Selecting purpose unlocks Q2 and Q3, which the user can tap in any order. Navigation fires when all three are selected. This keeps the card at a fixed height of ~280px regardless of interaction state.

**Steps:** 1 visual step, 3 taps. No accordion expansion.

**Vertical space:** fixed at ~280px. Current intent step at full expansion: ~380px. A 100px reduction on the most important entry surface.

---

### B. Browse / Pick your spot flow

**Entry point:** user clicks a destination pill in the Browse section.

**What is already known:** purpose (inferred from category — Surf → `purpose=surf`, Hike → `purpose=hike`, etc.) and a pre-filled `workStyle=light` default.

**What to ask:** only the remaining two inputs. Purpose must NOT be shown again.

**City-page IntentPrompt behavior:**

When `intent.purpose` exists in the URL but `dailyBalance` is missing, the IntentPrompt renders in a compact 2-question form:

```
┌────────────────────────────────────────┐
│ [bark bar]                             │
│                                        │
│  Your surf stay in Puerto Escondido    │
│                                        │
│  How heavy is your workload?           │
│  [ Light ]  [ Balanced ]  [ Heavy ]    │
│                                        │
│  What shapes your base?                │
│  [ Purpose-first ] [Balanced] [Work]   │
│                                        │
│                Skip                    │
└────────────────────────────────────────┘
```

Fixed height: ~200px. Much lighter than the current city-page IntentPrompt.

When the full URL arrives with all three params (`?purpose=surf&workStyle=light&dailyBalance=purpose_first`), the IntentPrompt is completely suppressed. BestBaseCard fires immediately.

**What is inferred vs asked:**

| Source | Purpose | Work intensity | Daily balance |
|--------|---------|----------------|--------------|
| Homepage search | Asked | Asked | Asked |
| Browse (Surf category) | `surf` inferred | Asked | Asked |
| Browse (Hike category) | `hike` inferred | Asked | Asked |
| Browse (Remote work hubs) | `work_first` inferred | Asked | Balance not asked (implied work-first) |
| Direct URL / SEO (no params) | Asked | Asked | Asked |

---

## 3. Better Input Copy

### Work question

**Current:** "How much do you work?" with options: Light / Balanced / Intensive

This is vague and feels like a personality quiz. "How much do you work" is ambiguous — does it mean hours per day, per week, per trip? And "Intensive" is a tone word, not a time description.

**Recommended v2:**

```
How heavy is your workload this trip?

[ Light ]           [ Balanced ]       [ Heavy ]
A few hours a day   Half workdays      Full remote days
```

Why this is better:
- "This trip" anchors it to the stay context, not general life
- Hour ranges are concrete — users can map their reality to an option without interpretation
- "Heavy" is direct and honest; "Full remote days" explains what it means
- All three labels are parallel: adjective + time description

### Daily balance question

**Current:** Does not exist.

**Recommended v2:**

```
What shapes your base choice?

[ Purpose-first ]        [ Balanced ]          [ Work-first ]
Activity gets my time    Equal mix each day     Work blocks are set;
— work fits around it    — neither wins         activity fills the gaps
```

Why this copy:
- The frame "what shapes your base choice" is directly useful — it explains what the answer *does* in the product
- Helper text shows the real tradeoff without being abstract
- "Activity gets my time — work fits around it" is how a real surfer thinks, not "I want to be balanced"
- "Work blocks are set; activity fills the gaps" is how a heavy remote worker actually lives their stay

**Product note on `work_first` purpose + `daily balance` question:**
When `purpose === "work_first"`, hide the daily balance question. It is not meaningful: if you chose "Work first" as your purpose, the balance is already answered. Navigate immediately after work intensity is selected.

---

## 4. Recommended Final v2 Input Model

### Exact questions and options

---

**Question 1: Purpose**

> *What are you going for?*

| Value | Label | Emoji |
|---|---|---|
| `surf` | Surf | 🏄 |
| `dive` | Dive | 🤿 |
| `hike` | Hike | 🥾 |
| `yoga` | Yoga | 🧘 |
| `kite` | Kite | 🪁 |
| `work_first` | Work first | 💻 |
| `exploring` | Exploring | 🗺️ |

---

**Question 2: Work intensity**

> *How heavy is your workload this trip?*

| Value | Label | Helper |
|---|---|---|
| `light` | Light | A few hours a day |
| `balanced` | Balanced | Half workdays |
| `heavy` | Heavy | Full remote days |

---

**Question 3: Daily balance** *(hidden when purpose = `work_first`)*

> *What shapes your base choice?*

| Value | Label | Helper |
|---|---|---|
| `purpose_first` | Purpose-first | Activity gets my time — work fits around it |
| `balanced` | Balanced | Equal mix each day |
| `work_first` | Work-first | Work blocks are set; activity fills the gaps |

---

### What flows ask what

| Flow | Q1 Purpose | Q2 Work | Q3 Balance |
|---|---|---|---|
| Homepage search | ✅ Asked | ✅ Asked | ✅ Asked (unless work_first) |
| Browse Surf/Hike/etc. | ✅ Pre-filled | ✅ Asked | ✅ Asked |
| Browse Remote work hubs | ✅ Pre-filled (`work_first`) | ✅ Asked | ❌ Skipped |
| City page IntentPrompt (cold, no params) | ✅ Asked | ✅ Asked | ✅ Asked |
| City page IntentPrompt (purpose pre-filled) | ✅ Already set | ✅ Asked | ✅ Asked |
| Change intent (from BestBaseCard) | ✅ Asked | ✅ Asked | ✅ Asked |

---

### New URL params

Current: `?purpose=surf&workStyle=light`  
V2: `?purpose=surf&workStyle=light&dailyBalance=purpose_first`

`dailyBalance` is optional — if absent, the scoring engine uses a default derived from `workStyle` (backward compatible).

---

## 5. UI Pattern Recommendation

### Evaluated options

| Pattern | Problem |
|---|---|
| Progressive reveal (current) | Grows vertically, breaks hero composition |
| Modal | Breaks the map context; feels heavy for 3 taps |
| Bottom sheet | Mobile-native, wrong context for a web product |
| Separate onboarding page | Too much friction — full navigation break |
| Fixed-height inline card | ✅ Recommended |

### Recommendation: fixed-height inline card with simultaneous questions

The card replaces the search input in the hero (or sits inline on the city page) at a **fixed height**. All three questions are visible at the same time — not revealed progressively. Questions 2 and 3 are rendered in a muted/disabled state until Q1 is answered.

**Visual spec for the search form card (hero):**

```
Height: fixed at ~260px (desktop), ~300px (mobile)
Width: same max-w-lg as current search form

Structure (top to bottom):
  [3px teal accent bar]
  [City name in teal · Back arrow right-aligned]   ~40px
  [Q1 headline: "What are you going for?"]          ~24px
  [7 pills in 2 fixed rows, no flex-wrap]           ~72px
  [divider]                                         ~1px
  [Q2 label + 3 horizontal pills]                   ~64px
  [Q3 label + 3 horizontal pills]                   ~64px (hidden for work_first)
  [Skip link right-aligned]                         ~28px
                                              ─────────────
                                              Total: ~293px
```

**Key change for purpose pills — move from flex-wrap to a fixed 2-row grid:**

Row 1: 🏄 Surf · 🤿 Dive · 🥾 Hike · 🧘 Yoga
Row 2: 🪁 Kite · 💻 Work first · 🗺️ Exploring

This is a `grid grid-cols-4` → `grid-cols-3` layout, not a `flex-wrap`. Fixed height. No reflow on selection.

**Work intensity and daily balance pills — horizontal row, not stacked cards:**

Current work-style design uses `flex-col items-start` cards with two lines of text — this is taller than necessary. v2 uses 3 single-line pills per question, with the helper text as a `title` tooltip on hover/focus (not inline). This drops each question from ~60px to ~40px.

**City page IntentPrompt — same spec, smaller:**

On the city page (between map and place sections), the prompt should feel as light as a chip row, not as heavy as a card. The city name is already in the page header. The prompt needs only:

```
[1px bark line at top]
[Inline heading: "What kind of stay are you planning?"]   ~24px
[Q1: purpose pills — 2 rows grid]                         ~72px
[Q2: work pills — horizontal row]                         ~44px
[Q3: balance pills — horizontal row]                      ~44px
[Skip]                                                    ~24px
─────────────────────────────────────────────────────────
Total: ~208px (vs current ~380px)
```

No large description paragraph below the heading. The body ("We'll find your best base...") should be removed from the city page version — the user is already on the city page. They know what happens.

---

## 6. Loading Experience

### Recommendation: inline card transition with CSS animation, no Lottie

**Why not full-screen loading:** TrustStay is an SSR app. When the user updates URL params, Next.js App Router triggers a server re-render — but the page shell (header, map, summary cards) is already rendered. A full-screen loader would flash over content that is already correct. The only thing that's "loading" is `BestBaseCard` resolving (LLM call + scoring) inside the `Suspense` boundary.

**Why not Lottie:** Adds a dependency (15–30KB), risks animation inconsistency between environments, and is harder to maintain. TrustStay's visual language (clean, typographic, subtle) is better served by a CSS animation that matches the existing design tokens.

**Recommended pattern:**

When the user taps the final intent selection, the `IntentPrompt` / search intent card immediately transitions to a **loading state card** that stays in the same position and has the same approximate height. The loading card shows:

1. The personalized headline (see Section 7)
2. A subtle 3-dot pulse animation in teal
3. The selected intent chips as small read-only pills (reinforces that the selection was received)

The loading card remains until the `Suspense` boundary resolves and `BestBaseCard` appears. It then fades out.

**Animation spec:**

```css
/* 3-dot teal pulse — pure CSS */
.loading-dots span {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-teal);
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-pulse {
  0%, 60%, 100% { opacity: 0.2; transform: scale(0.85); }
  30% { opacity: 1; transform: scale(1); }
}
```

This is ~15 lines of CSS, zero dependencies, and uses the existing `teal` token. It reads as premium — slow, breathing, deliberate — rather than fast-spinning or mechanical.

**Where it renders in the component tree:**

In `IntentPrompt` and `CitySearch`, after the final selection is tapped, set a `loading: true` state. Render the loading card instead of the intent form. The card disappears when navigation completes (Next.js `useTransition` or `startTransition` can signal pending state to keep the loading card alive until the server component resolves).

---

## 7. Personalized Loading Copy

### Pattern

**Headline:** `[Verb]-ing your [purpose adjective] + [work adjective] setup in [City]...`

**Supporting line (one universal line):** `Finding the best base and what to prepare before you arrive.`

The supporting line is intentionally fixed — it does not need to personalize further. The headline carries the personalization. The supporting line anchors the product promise.

### Five example variants

| Purpose | Work | Daily balance | Headline |
|---|---|---|---|
| Surf | Light | Purpose-first | Preparing your surf + light work setup in Tamarindo... |
| Hike | Balanced | Balanced | Finding your base for a hike + work stay in Cusco... |
| Dive | Heavy | Work-first | Mapping your dive + work base in Utila... |
| Work first | Heavy | (skipped) | Setting up your focused remote work base in Medellín... |
| Yoga | Light | Purpose-first | Preparing your yoga retreat setup in Nosara... |

### Exact generation pattern (implementation)

```typescript
function loadingHeadline(intent: StayIntent, cityName: string): string {
  const purposeVerb: Record<string, string> = {
    surf:       "Preparing your surf",
    dive:       "Mapping your dive",
    hike:       "Finding your base for a hike",
    yoga:       "Preparing your yoga",
    kite:       "Mapping your kite",
    work_first: "Setting up your focused remote work base in",
    exploring:  "Preparing your",
  };
  const workAdj: Record<string, string> = {
    light:    "light work",
    balanced: "work",
    heavy:    "intensive work",
  };
  if (intent.purpose === "work_first") {
    return `${purposeVerb.work_first} ${cityName}...`;
  }
  const verb = purposeVerb[intent.purpose] ?? "Preparing your";
  const work = workAdj[intent.workStyle] ?? "work";
  return `${verb} + ${work} setup in ${cityName}...`;
}
```

**Loading supporting line (fixed):**
> Finding the best base and what to prepare before you arrive.

---

## 8. Product Logic Impact of Daily Balance

### Does daily balance meaningfully change the output? Yes, in three ways.

**Currently broken scenario:** A surfer who selects `workStyle=heavy` gets assigned `profile: work_primary` in `resolveProfile()`. This means the base area centroid is weighted maximally toward coworking density. For a surf destination like Puerto Escondido or Santa Teresa, this produces a base recommendation that optimizes for work infrastructure — which may be nowhere near the surf break the user came for.

Daily balance (`dailyBalance: "purpose_first" | "balanced" | "work_first"`) directly fixes this:

#### Change to `resolveProfile()`

```typescript
// v2 profile resolution — daily balance decouples purpose priority from work hours
function resolveProfile(intent: StayIntent): FitProfile {
  if (intent.purpose === "work_first") return "work_primary";
  if (intent.purpose === "exploring") return "generic";

  if (!ACTIVITY_PURPOSES.includes(intent.purpose)) return "generic";

  const balance = intent.dailyBalance ?? "balanced";
  if (balance === "work_first") return "work_primary";             // base optimized for work
  if (balance === "purpose_first") return "activity_light_work";   // base optimized for activity
  return "activity_balanced_work";                                  // equal
}
```

This means a surfer with `workStyle=heavy` but `dailyBalance=purpose_first` gets profile `activity_light_work` — their base is chosen near surf infrastructure, with work coverage as a secondary requirement. This is the correct product behavior.

#### Change to `PROFILE_WEIGHTS` and daily-life emphasis

When `dailyBalance === "purpose_first"`, the scoring engine already uses:
```
activity_light_work: { work: 0.25, purpose: 0.35, dailyLife: 0.40 }
```
The high `dailyLife` weight (0.40) makes sense for a purpose-first person — they spend more non-work time in the neighborhood and need grocery, pharmacy, and food options close by. This already exists and is correct.

When `dailyBalance === "work_first"`, the engine uses:
```
work_primary: { work: 0.55, purpose: 0.10, dailyLife: 0.35 }
```
Correct — work dominates the base choice, but daily life still matters.

#### Change to LLM narrative tone

The `narrativeInputs` struct should include `dailyBalance`. The LLM system prompt should adapt tone:

- `purpose_first`: "The activity defines this stay. Your base is near [area] where [purpose] infrastructure is strong. Work is covered but secondary."
- `work_first`: "Work blocks are your anchor. Your base is in [area] where work infrastructure is strong, with [purpose] accessible around your schedule."
- `balanced`: neutral tone, as now.

This is a `narrativeInputs` field addition and a prompt tweak — no architectural change.

#### Map and list ordering

Currently, place ordering is fixed (coworkings first, then work cafés, etc.) regardless of intent profile. With `dailyBalance === "purpose_first"`, the map should show the base marker closer to purpose infrastructure (when `purposeFit` data exists). The list ordering is unaffected for now since `purposeFit` is still null.

**Bottom line:** Daily balance changes three real outputs — base area recommendation, narrative tone, and scoring weights. It is NOT fake personalization. It fixes a genuine bug in the current model (heavy-work activity users getting a work-primary base recommendation).

---

## 9. What Should Wait Until Later

Evaluated explicitly:

| Input | Should it wait? | Reason |
|---|---|---|
| **Call intensity** (calls per day) | ✅ Yes | Would only change one signal (noiseRisk weighting). A user can infer this from work intensity. Not enough differentiation to justify a fourth question. |
| **Social vs quiet** (vibe) | ✅ Yes | The `vibe` field already exists in `StayIntent` but is never used in scoring. Do not surface a question whose answer doesn't change the output. Add when we have social/quiet POI data. |
| **Food preferences** (vegan, paleo, etc.) | ✅ Yes | No food-type OSM data. Would require a third-party restaurant API. The current "daily-life fit" model is about proximity and access, not dietary fit. |
| **Transport dependence** | ✅ Yes | Valid signal (scooter towns vs walkable towns), but highly destination-specific. Better surfaced as a static flag on the destination than as a user input. |
| **Recovery needs** | ✅ Yes | Too niche. Maps to "yoga + purpose-first" which is already captured. |
| **Walking vs scooter dependence** | ✅ Yes | Same as transport dependence — destination attribute, not user attribute. Surfaced in red flags ("no grocery within 2km — will require transport") which is already implemented. |

**One input to watch (not now but not far):** a simple "Stay length" selector (1 week / 2–4 weeks / 1+ month). This would affect daily-life emphasis dramatically — a 1-week surfer does not care about pharmacy proximity; a 1-month surfer cares a lot. This changes `computeDailyLifeScore` thresholds meaningfully. But it adds a fourth question, which violates the current 3-input ceiling. Worth revisiting after v2 is validated.

---

## 10. Final Recommendation

### Best v2 input flow

**Three inputs, all visible simultaneously, fixed-height card:**
1. Purpose (7 pills, 2-row grid)
2. Work intensity (3 pills, horizontal: Light / Balanced / Heavy)
3. Daily balance (3 pills, horizontal: Purpose-first / Balanced / Work-first) — hidden for `work_first` purpose

Navigation fires when all three are selected. Skip is always available.

### Best UI pattern

**Fixed-height inline card** — ~260px desktop, ~300px mobile. Not a sequential expand. Q2 and Q3 always visible (grayed until Q1 selected). Replaces the search form in the hero card; appears inline on city pages below the map. No modal, no bottom sheet, no page change.

### Best loading pattern

**CSS-only 3-dot teal pulse, inline in the same card position.** Loading card shows:
- Personalized headline (see above)
- Fixed supporting line: "Finding the best base and what to prepare before you arrive."
- Selected intent chips as read-only pills
- 3-dot teal pulse

Zero dependencies. Consistent with TrustStay's design language. Appears in the same DOM position as the intent card — no layout shift.

### Best exact copy

**Q1:** "What are you going for?"  
**Q2:** "How heavy is your workload this trip?" → Light / Balanced / Heavy  
**Q3:** "What shapes your base choice?" → Purpose-first / Balanced / Work-first

**Loading headline:** `Preparing your [purpose] + [work] setup in [City]...`  
**Loading supporting:** `Finding the best base and what to prepare before you arrive.`

**Skip link:** "Skip — just show me [City]" (unchanged, correct)

### Smallest high-leverage implementation to build next

**Phase 1 (copy + layout, no new types):**  
Refactor `CitySearch` and `IntentPrompt` to fixed-height cards with simultaneous questions. Change purpose pills from `flex-wrap` to a 2-row CSS grid. Change work-style cards from tall `flex-col` layout to compact single-line pills. Add inline loading state. This requires no changes to `scoring.ts` or the type system — just the UI components.

**Phase 2 (new type + scoring fix):**  
Add `dailyBalance: "purpose_first" | "balanced" | "work_first"` to `StayIntent`. Update `parseIntent()` in `city/[slug]/page.tsx`. Update `resolveProfile()` to use `dailyBalance` instead of `workStyle` for profile resolution. Update `narrativeInputs` struct. Add to KV narrative cache key if it affects LLM output.

Phase 1 can ship immediately. Phase 2 requires a type change and scoring update but no new data sources — it is straightforward work that fixes the "heavy-work surfer gets a work base" bug.
