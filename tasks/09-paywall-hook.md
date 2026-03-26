# Task 09 — Paywall Hook

## Objective
Give users a concrete reason to unlock before they hit the paywall button.
The current paywall shows "+5 more work spots" — a number without context.
Users need to feel what they are missing, not just count it.

## Problem
- Locked count labels are generic: "+3 more work spots", "+2 more coffee & meal spots"
- There is no signal about the quality of the locked content
- The CTA "Unlock City Pass" does not mention the city
- Users have no urgency — they already got the free preview and feel "good enough"

## Must include

### A. Qualitative hook line above the locked items list
A single sentence that communicates the nature of the locked content, not just
the count. Generated server-side in `CityContent` and passed to `PaywallCard`.

Logic:
- If locked work spots include coworkings: "Includes dedicated coworking spaces with verified hours."
- If locked work spots are cafés only: "More work-friendly cafés near your base."
- If locked coffee & meals include Google-enriched places: "Places with ratings, hours, and menus available."
- If all locked categories have something: "Full setup — work, meals, and training options."
- Fallback: "More options across all categories."

New optional prop on `PaywallCard`: `hookLine?: string`
- If present, render it above the locked items list in a subtle styled line
- If absent, render nothing (backward compatible)

### B. CTA button copy updated to include city name
- Change "Unlock City Pass" to "Unlock {cityName} setup"
- Character limit awareness — if city name is long, truncate gracefully
- Keep "Opening checkout…" loading state as-is

### C. Trust line below the CTA updated
- Current: "One-time · No account needed"
- New: "One-time · No account needed · Instant access"

## Constraints
- Do not change the Stripe checkout flow
- Do not change the cookie unlock logic
- Do not redesign the PaywallCard layout
- `hookLine` is optional — no breaking changes
- Keep copy honest — do not claim "verified" unless enrichment data confirms it

## Done when
- PaywallCard shows a context sentence above the locked items
- CTA button reads "Unlock Lisboa setup" or "Unlock Medellín setup" etc.
- Trust line includes "Instant access"
- Build and lint pass cleanly
