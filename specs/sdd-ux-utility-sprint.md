# SDD UX Utility Sprint Spec

## Objective
Improve unlock conversion and post-unlock usefulness for remote workers by making destination decisions clearer, preserving intent across checkout, and reducing share-entry confusion.

## User
Remote worker planning a destination-specific stay (example: Popoyo for surf) who needs to keep work routine and life logistics stable from day one.

## Jobs To Be Done
- Decide where to base within a destination quickly and confidently.
- Keep chosen intent (purpose/work style/daily balance) across key flows.
- Understand what unlock adds before paying and use unlocked output immediately.
- Share destination links that open in clean new-user mode.

## Non-goals
- Rebuild scoring engine logic in this sprint.
- Add new payment products/subscriptions.
- Expand destination catalog.

## Scope
1. City page decision clarity.
2. Checkout continuity and post-payment context.
3. Landing map expectation setting.
4. Sharing + social preview reliability.

## Functional Requirements

### FR1: City page decision clarity
- Show a clear primary next action above the fold.
- Present micro-area tradeoffs in comparable, scan-friendly format.
- Highlight day-1 readiness signals (work setup, backups, essentials, transport assumptions).

### FR2: Intent continuity
- Preserve `purpose`, `workStyle`, `dailyBalance` from pre-checkout through finalize redirect.
- User must not be forced to re-run Shape This Stay after successful payment return.

### FR3: Post-unlock value reveal
- Immediately after unlock, user sees what changed and next action.
- Unlocked state should emphasize actionable planning outputs, not generic success copy.

### FR4: Clean sharing
- Share actions produce canonical destination URL `/city/{slug}` only.
- No unlock/session/intent params in shared URL.

### FR5: Social preview reliability
- OpenGraph image URLs must resolve to real assets/routes for home and destination pages.
- Platform fallback icon behavior should not occur for valid links.

## UX States (Required)
- Locked with no intent
- Locked with intent
- Checkout in progress
- Checkout success with preserved intent
- Unlocked with stacked micro-area output
- Shared-link new user entry (no inherited unlock/intent)

## Acceptance Criteria (Given/When/Then)

### AC1: No post-payment intent reset
- Given a user selected `purpose=surf`, `workStyle=balanced`, `dailyBalance=balanced`
- When they complete checkout
- Then they return to `/city/{slug}` with intent preserved and unlocked content visible
- And Shape This Stay is not re-required.

### AC2: Shared link is clean
- Given an unlocked user on `/city/{slug}?justUnlocked=1&purpose=...`
- When they tap Share
- Then clipboard/native share URL equals `/city/{slug}` (canonical).

### AC3: Destination social card resolves
- Given a destination URL `/city/{slug}`
- When fetched by social unfurler
- Then OG image URL is resolvable and card title/description/image render without platform default icon.

### AC4: Day-1 readiness visibility
- Given unlocked destination output with micro-areas
- When user opens cards
- Then they can identify at least one work setup signal and one routine/logistics signal per top area without leaving the page.

## Telemetry Requirements
- `city_page_viewed`
- `intent_selected`
- `unlock_clicked`
- `checkout_started`
- `checkout_success`
- `unlocked_content_viewed`
- `micro_area_compared`
- `share_clicked`
- `shared_url_clean` (boolean property)

## Success Metrics
- Increase unlock click-through from city page.
- Decrease post-payment intent-reset loops.
- Increase post-unlock interaction with micro-area/logistics sections.
- Reduce support-like confusion events around sharing and checkout return.

## Implementation Mapping
- `src/app/city/[slug]/page.tsx`
- `src/components/IntentPrompt.tsx`
- `src/components/MicroAreaStack.tsx`
- `src/components/MicroAreaBaseCard.tsx`
- `src/components/BestBaseCard.tsx`
- `src/components/PaywallCard.tsx`
- `src/app/api/checkout/route.ts`
- `src/app/api/checkout/finalize/route.ts`
- `src/components/ShareButton.tsx`
- `src/app/layout.tsx`
- `src/app/opengraph-image.tsx`
