# Task 11 — Neighborhood / Area Search + Search Autocomplete

## Objective
Allow users to search for a specific neighborhood or district (e.g. "El Poblado",
"Bairro Alto", "Shoreditch") in addition to full cities. Add a lightweight autocomplete
to the search input so users can discover the right search term faster.

## Problem
- The current search only works at city level. A user who knows they want "El Poblado"
  in Medellín has no way to scope the results to that area.
- The centroid heuristic works well for unknown cities but fails when a user already
  knows which neighborhood they want to base themselves in.
- The search input gives no feedback while typing — users must guess the exact city name.

## Must include

### A. Neighborhood-aware geocoding
- Nominatim already returns `osm_type`, `type`, and `addressdetails` on search results.
- When the top Nominatim result is a **neighbourhood, suburb, quarter, or city_district**
  (not a city/town/village), treat it as an area-level search:
  - Use the result's `boundingbox` directly as the Overpass query bbox
  - Use the parent city name (from `address.city` or `address.town`) for display
  - Use the neighbourhood name as the page heading or a subtitle
- When the result is a city/town, keep current behavior unchanged.
- Nominatim result types to treat as area-level:
  - `type === "neighbourhood"` or `type === "suburb"` or `type === "quarter"`
    or `type === "city_district"` or `type === "residential"`
- Fall back to city-level search if the area bbox is too large (> ~0.3° in either axis).

### B. URL / routing
- Keep the same `/city/[slug]` route — no new routes needed.
- The slug can be the neighbourhood name (e.g. `el-poblado`) or a combined
  `city-neighbourhood` slug (e.g. `medellin-el-poblado`).
- The geocoded `City` object should carry enough data for the city page to display
  correctly (name, country, lat, lon, bbox).
- Store the area-level bbox in the geocoded result so Overpass uses it directly.

### C. Search autocomplete
- Debounced input (300 ms) — only fires after the user has typed ≥ 3 characters.
- Calls Nominatim `/search` with `limit=5`, `addressdetails=1`.
- Shows a small dropdown below the input with up to 5 suggestions.
- Each suggestion shows:
  - Primary label: `neighbourhood` / `suburb` / `city` name
  - Secondary label: parent city + country (e.g. "Medellín, Colombia")
  - Optional type pill: "Neighborhood" | "City" | "District"
- Selecting a suggestion fills the input and submits immediately.
- Keyboard navigation (↑ ↓ Enter Escape) on the dropdown.
- If Nominatim fails or returns nothing, dropdown hides silently — search still works.
- Must not break the existing form submit flow.

### D. City object extension
- Add optional `bbox?: [south: number, west: number, north: number, east: number]`
  to the `City` type.
- `fetchPlaces` in `overpass.ts` should use `city.bbox` when present instead of
  computing a bbox from `lat/lon` with a fixed radius.
- When `bbox` is present, the Overpass query is scoped exactly to that bounding box.

## Constraints
- Do not add a maps UI or embed a map anywhere.
- Do not add a new database or persistence layer.
- Nominatim autocomplete calls must be debounced and respect the existing User-Agent.
- Autocomplete dropdown must be accessible (keyboard nav, focus management).
- If the neighborhood has very few places (< 5), show the data coverage indicator
  from Task 10 — do not crash or show empty sections silently.
- Keep the existing city-level flow fully intact — this is additive only.

## Done when
- Searching "El Poblado" shows a Medellín city page scoped to El Poblado's bbox
  (not the entire city).
- Searching "Bairro Alto" or "Chiado" scopes results to that Lisbon district.
- Typing "El Po" in the search box shows autocomplete suggestions including
  "El Poblado · Medellín, Colombia".
- Searching a full city name (e.g. "Lisboa") still works exactly as before.
- No crashes or empty states when a neighborhood has sparse OSM data.
