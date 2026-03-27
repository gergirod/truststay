# Task 16 — Suggest a Place

## Objective
Let unlocked users submit a missing work spot, café, or gym that doesn't appear in the place list.
Submissions go to an admin review queue. Approved places are added to a curated override list
and appear in the neighborhood on next load.

## Problem
- OSM data misses many coworking spaces, local cafés with good wifi, and small gyms
- These gaps are most visible to people who have actually been to the place — i.e. past visitors
- Unlocked users are the highest-quality source of corrections: they've paid, they have context
- Currently there is no mechanism to accept community data — the product is entirely read-only

## Must include

### A. "Suggest a missing spot" button
Shown **only on unlocked neighborhood pages**, at the bottom of each place-list section
(Work, Coffee & meals, Wellbeing).

Label: `+ Suggest a missing spot`
Style: subtle, text-link style — not a primary CTA. Does not compete with the place cards.

Clicking it expands an inline form below the section (no modal, no navigation).

### B. Suggestion form (inline, collapsible)
Fields:
- **Name** (required) — text input, placeholder: "Name of the place"
- **Google Maps link** (required) — paste URL from Maps. Validates that it contains `maps.google` or `goo.gl` or `maps.app.goo.gl`.
- **Category** (required) — select: `Work spot` · `Café / meals` · `Gym / wellbeing`
- **Note** (optional) — textarea, max 200 chars, placeholder: "Anything useful: wifi speed, hours, vibe…"

Submit button: `Submit suggestion →`

On submit: form collapses, show inline confirmation: *"Thanks — we'll review it."*
State stored in localStorage so the form doesn't re-expand on refresh.

### C. API route `/api/suggest`
Accepts `POST`:
```json
{
  "name": string,
  "mapsUrl": string,
  "category": "work" | "food" | "wellbeing",
  "note": string | null,
  "citySlug": string,
  "neighborhoodSlug": string
}
```

Server-side validation:
- All required fields present
- `mapsUrl` matches a Google Maps URL pattern
- `name` not empty, max 100 chars
- `note` max 200 chars

Storage: same pattern as Task 13 (Vercel KV preferred, console log fallback).
Returns `200` on success, `400` on validation failure with `{ error: string }`.

### D. Admin queue: "Suggested Places" tab
Add a "Suggested Places" tab to the existing `/admin` page.
Columns: place name · Maps link (clickable) · category · city · neighborhood · note · date.

Admin actions per row:
- **Dismiss** — mark as rejected, hide from queue
- **Add to curated** — copies the place details to clipboard in the format expected by the
  curated overrides structure (future task), or opens a pre-filled form

### E. Curated overrides (lightweight, file-based)
Create `src/data/placeOverrides.ts` — a typed list of manually approved suggestions:
```ts
export interface PlaceOverride {
  citySlug: string;
  neighborhoodSlug: string;
  category: "work" | "food" | "wellbeing";
  name: string;
  lat: number;
  lon: number;
  note: string;
  mapsUrl: string;
}

export const PLACE_OVERRIDES: PlaceOverride[] = [];
```

When approved, admin adds the entry here. The city page merges `PLACE_OVERRIDES` into the
fetched place list for the relevant neighborhood (append to the relevant category array,
tag with `source: "community"`).

Community-sourced places show a small "community pick" label on their card.

## Constraints
- Form is **only visible on unlocked pages** — do not show to free users
- Do not auto-publish submissions — everything goes through admin review
- Do not build a real-time database for this — file-based overrides are sufficient for v1
- The inline form must not break the place list layout when collapsed
- Google Maps URL validation must be lenient enough to accept short links (`goo.gl/maps/...`)

## Done when
- "+ Suggest a missing spot" appears at the bottom of each section on unlocked pages
- Clicking it expands the inline form
- Valid submission collapses the form and shows "Thanks — we'll review it."
- Invalid submission (bad Maps URL, empty name) shows inline field error
- `POST /api/suggest` stores or logs the submission
- Admin page shows a "Suggested Places" tab with submitted entries
- `src/data/placeOverrides.ts` exists and is merged into the place list on city pages
- Community-picked places show a "community pick" label
- Build and lint pass cleanly
