# TrustStay — Next Implementation Priority v1

## The core gap

Right now, a user who enters from the homepage via search almost certainly sees the wrong product.

```
Homepage search → /city/puerto-escondido (no intent params)
  → AutoNeighborhoodOrContent → CityNeighborhoodGrid (grid-only, no BestBaseCard)
```

BestBaseCard never fires. The user sees a neighborhood grid, picks one manually, and may or may not set intent from there. The product's best moment — the personalized base recommendation — requires the user to already know to pass `?purpose=` and `?workStyle=` in the URL.

This is the single highest-leverage fix: **make sure users entering from the homepage can reach the BestBase moment reliably.**

---

## Priority order

```
1. Intent prompt on city page (highest leverage, broadest reach)
2. Intent step in homepage search (highest conversion entry point)
3. PlaceModal stay-fit context (highest density — seen by every user who opens a place)
4. Copy-only changes (no code — review copy_alignment_v1.md)
```

---

## 1. Intent prompt on city page — "Shape this stay"

**Why this is #1:** It catches intent regardless of how the user arrived — search, grid link, direct URL, shared link, SEO. It's the most reliable path to BestBaseCard.

### What it does

When a user arrives at a city page without `?purpose=` or `?workStyle=` params, show a small inline intent selector between the city header and the main content. Once the user picks their stay type, the page re-navigates with intent params appended, and BestBaseCard renders.

### Where it lives

A new client component: `src/components/IntentPrompt.tsx`

Rendered in `CityContent` (or above it) when `intent === null`. When the user makes a selection, it updates the URL using `router.push` with the current URL + intent params.

### UX behavior

```
[User arrives at /city/puerto-escondido — no intent]

"What kind of stay is this?"

  [Surf]  [Hike]  [Dive]  [Yoga]  [Kite]  [Work first]  [Just exploring]

"How much work?"

  [Light]  [Balanced]  [Intensive]

→ User selects "Surf" + "Light"
→ Page navigates to /city/puerto-escondido?purpose=surf&workStyle=light
→ BestBaseCard renders above place sections
```

### Placement options

**Option A — above CityContent (before map and cards):**
Shows immediately, before any content loads. Fastest to reach intent. Downside: the user hasn't seen what the city looks like yet.

**Option B — between the map and the BestBaseCard slot:**
The user sees the map first (spatial context), then gets asked about their stay, then gets the recommendation. This is the most natural flow.

**Recommendation: Option B.** The map first, intent prompt second. The user understands where they are spatially before answering what they need. This is the same framing as a good travel advisor: "Here's the city. What kind of stay are you planning?"

### Component spec

```tsx
// src/components/IntentPrompt.tsx
"use client";

interface Props {
  citySlug: string;
  // Any current params to preserve (lat, lon, name, etc.)
  currentParams: Record<string, string>;
}

// Renders a compact 2-row selector:
// Row 1: purpose pills (Surf / Dive / Hike / Yoga / Kite / Work / Exploring)
// Row 2: work style pills (Light / Balanced / Intensive) — appears after purpose is selected

// On selection: router.push with current params + purpose + workStyle appended
// Uses useRouter() from next/navigation
// Fires analytics: "intent_set" with city_slug, purpose, work_style, source: "city_page_prompt"
```

### State it needs

- `selectedPurpose: StayPurpose | null`
- `selectedWorkStyle: WorkStyle | null`
- Navigation fires when both are selected (no explicit submit needed)

### What it replaces

Nothing is removed. When intent IS already present, `IntentPrompt` does not render. It's purely additive.

### Free vs locked

The prompt is fully free. Selecting intent doesn't trigger checkout — it just reshapes the page. The paywall only appears after BestBaseCard is shown and the user tries to unlock it.

---

## 2. Intent step in homepage search

**Why this is #2:** The homepage is the highest-traffic entry point and the most intentional user action (they typed a city name). Getting intent here means every homepage search triggers BestBaseCard reliably.

**Why it's #2 not #1:** The city-page prompt (#1) catches all entry vectors. The homepage step only catches homepage users. Build #1 first — it's safer (additive only) and has broader reach.

### What it does

After the user selects a city from the autocomplete and before navigation, show a two-step intent selector inline in the search card. On completion, navigate with intent params.

### UX flow

```
Step 1: User types "Puerto Escondido" → selects from autocomplete
        → City resolved, short intent selector appears below the search bar

Step 2: "What kind of stay?"
        [Surf] [Hike] [Dive] [Yoga] [Kite] [Work] [Exploring]
        + "How much work?" (appears after purpose picked)
        [Light] [Balanced] [Intensive]

Step 3: User selects intent
        → Navigate: /city/puerto-escondido?lat=...&purpose=surf&workStyle=light

Skip option: "Skip — just show me the city" → navigates without intent params
```

### Where it lives

Inside `CitySearch.tsx`. After `selectSuggestion` resolves a city, instead of immediately calling `navigateToCity(city)`, it sets a `pendingCity` state and shows the intent step. Navigation happens when intent is complete or skipped.

### Component structure

```tsx
// CitySearch.tsx additions:
type SearchStep = "search" | "intent";

const [step, setStep] = useState<SearchStep>("search");
const [pendingCity, setPendingCity] = useState<City | null>(null);
const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

// After selectSuggestion:
function selectSuggestion(s) {
  const city = s.city;
  setPendingCity(city);
  setStep("intent"); // show intent step instead of navigating
}

// Intent step renders below the search bar (or replaces it):
// Purpose pills → workStyle pills → navigate
// "Skip" link → navigateToCity(pendingCity) with no intent params
```

### Analytics events to add

- `intent_step_shown` — city, trigger source
- `intent_selected` — city, purpose, work_style
- `intent_skipped` — city (quantifies how many users don't engage)

### Interaction with existing `navigateToCity`

The existing `navigateToCity` function already builds params from a `City` object. Add a second argument: `navigateToCity(city, intent?)`. When intent is provided, append `?purpose=&workStyle=` to the URL params.

---

## 3. PlaceModal stay-fit context

**Why this is #3:** Every user who opens a place detail sees this modal. When intent is present, it's a missed opportunity to reinforce "this place works for your kind of stay."

### What it does

When `intent` is present, show a short contextual chip at the top of the place modal explaining why this place is in the list for this user's stay type.

### Example output

For a coworking, with `?purpose=surf&workStyle=light`:
> For **surf + light work**: closest verified work spot to your base.

For a café, with `?purpose=work_first&workStyle=heavy`:
> For **focused work**: high work-fit café — worth testing on arrival.

For a grocery, with any intent:
> Daily essential — closest grocery to your base.

### Implementation path

**Step 1:** Pass `intent: StayIntent | null` and `placeRank: number` (its position in the stayFit.topWorkPlaces list) into `PlaceModal` as optional props.

**Step 2:** In `PlaceSection`, when rendering cards, check if the place appears in `stayFit.topWorkPlaces` or `stayFit.topDailyLifePlaces`. Pass a `contextNote` string to `PlaceCard`, which then passes it to `PlaceModal`.

**Step 3:** In `PlaceModal`, if `contextNote` is present, render it as a tinted chip below the header:

```tsx
{contextNote && (
  <div className="mt-3 rounded-lg bg-mist border border-sage px-3 py-2">
    <p className="text-xs font-medium text-teal">{contextNote}</p>
  </div>
)}
```

**Scope of change:** `PlaceSection.tsx`, `PlaceCard.tsx`, `PlaceModal.tsx`, and the `CityContent` section where `stayFit` is available. No new components needed.

---

## 4. Copy-only changes

These do not require new components or routing changes. Each is a targeted edit to an existing file.

| Change | File | Effort |
|---|---|---|
| PaywallCard body, overline, locked items | `src/components/PaywallCard.tsx` | ~20 lines |
| Landing pricing: tier names + feature lists | `src/app/page.tsx` | ~15 lines |
| Landing HOW IT WORKS: 3 step texts | `src/app/page.tsx` | ~6 lines |
| Browse destinations overline + intro | `src/app/page.tsx` | ~3 lines |
| RoutineSummaryCard overline | `src/components/RoutineSummaryCard.tsx` | ~1 line |
| Neighborhood grid subtitle (no-intent) | `src/components/CityNeighborhoodGrid.tsx` | ~1 line |
| Footer | `src/app/city/[slug]/page.tsx` + `src/app/page.tsx` | ~2 lines |

See `docs/truststay_copy_alignment_v1.md` for the exact replacement copy for each.

---

## Recommended implementation order

```
Phase A — Copy (no risk, immediate consistency)
  1. PaywallCard (highest paywall leverage)
  2. Landing page pricing + HOW IT WORKS (homepage first impression)
  3. Browse destinations overline
  4. RoutineSummaryCard + neighborhood grid subtitle

Phase B — City page intent prompt (highest reach)
  5. Build IntentPrompt component
  6. Wire into CityContent between map and BestBaseCard slot
  7. Add analytics: intent_set, intent_dismissed

Phase C — Search intent step (homepage conversion)
  8. Modify CitySearch to hold navigation pending intent selection
  9. Add intent step UI (purpose + workStyle pills)
  10. Add skip option with analytics

Phase D — Place context (enrichment)
  11. Pass intent + context notes into PlaceModal
  12. Show stay-fit chip in modal when intent present
```

---

## What gives the highest product leverage first

### If you do nothing else: Phase A + Phase B

Phase A (copy) takes under an hour and means every existing user hitting the paywall sees language aligned with the product promise — not a directory feature list.

Phase B (intent prompt on city page) is the single change that ensures BestBaseCard fires for users who arrive via any vector. Without it, the product's best moment requires a specifically crafted URL. With it, it's one click away from any city page.

### Measuring success of Phase B

After IntentPrompt is live:
- Track `intent_set` events — what % of city page visits convert to an intent selection
- Track `best_base_unlock_clicked` — should increase relative to `paywall_viewed`
- Compare city pages that received intent vs. those that didn't — do intent users scroll further / convert more?

If `intent_set` / `city_page_viewed` reaches 30%+ within two weeks, BestBaseCard is effectively firing for a meaningful share of organic traffic. That's the validation signal.

---

## What does NOT need to change

- `BestBaseCard` component — already the best-written piece in the product
- Place section titles (Work / Coffee & meals / Wellbeing)
- Place section subtitles ("near your base", "without breaking your day")
- PlaceModal confidence notes structure
- "Map my routine" search button — keep exactly as-is
- `"Unlock your base →"` CTA — keep exactly as-is
- City page header/intro fallback copy
- "View setup" on neighborhood cards
- Intent propagation through grid links (already done)
- `AutoNeighborhoodOrContent` intent-aware routing (already done)
