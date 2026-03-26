# Task 10 — Data Coverage Indicator

## Objective
Handle cities with sparse or incomplete OpenStreetMap data gracefully.
Instead of showing empty sections silently, communicate the data situation
honestly so users know what they are looking at.

## Problem
- A search for a smaller or less-mapped city can return 2-3 places total
- The user sees nearly empty sections with no explanation
- This creates a "broken product" impression when it is actually a data coverage issue
- There is currently no feedback to the user about data quality or completeness

## Must include

### A. Data coverage level derived in `CityContent`
Compute a `dataCoverage` level from total place count:
- `"good"`: 15+ places total
- `"partial"`: 6–14 places total
- `"limited"`: 1–5 places total
- `"none"`: 0 places (separate from current error state)

### B. Coverage notice component (inline, not a banner)
Shown only when coverage is `"partial"` or `"limited"`.
Placed between the summary cards and the first section.
Styled as a low-key note — not an error, not a warning. Just honest context.

Content by level:
- `"partial"`: "Data coverage for {city} is moderate. Some options may be missing — OpenStreetMap data varies by city."
- `"limited"`: "We found limited place data for {city}. Results are incomplete. This city may be less covered in OpenStreetMap."

Do NOT show this notice for `"good"` coverage — do not over-communicate uncertainty
when the data is actually fine.

### C. Empty section messages already in place — verify they match the tone
The per-section empty messages from Task 07-08 should already be set.
Confirm they read correctly alongside the new coverage notice.
Avoid redundancy — if the notice already explains sparse data, section empty
messages can be shorter: "None found near this base."

### D. No notice for `"none"` — that is handled by the existing graceful error state
The existing `city_data_failed` fallback already handles zero places gracefully.
Do not duplicate that path.

## Constraints
- Do not add a permanent banner or header to every city page
- Only show the notice when coverage warrants it
- Do not change any existing error boundary or fetch logic
- Do not add new UI components — use an inline styled div consistent with
  the existing `MethodologyNote` component style

## Done when
- Searching a well-mapped city (Lisboa, Berlín) shows no coverage notice
- Searching a less-mapped city shows a calm, honest inline note
- The note does not appear when coverage is good
- Zero-places error state is unchanged
- Build and lint pass cleanly
