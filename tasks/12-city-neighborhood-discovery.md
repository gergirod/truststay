# Task 12 — City Neighborhood Discovery

## Objective
For large cities where staying "in the city" is meaningless, show a curated
neighborhood grid instead of a single city-wide place list. Users can explore
neighborhoods, see their routine scores, and unlock individually or as a bundle.

## Problem
- Searching "Buenos Aires" returns places scattered across a huge metro area —
  useless for deciding where to actually stay and work.
- The same applies to Mexico City, Bangkok, London, Berlin, etc.
- Users in these cities need to pick a BASE AREA first, then see details for it.
- Small cities (Chiang Mai, Medellín El Poblado) work fine with the current flow.

## New product flow

```
User searches "Buenos Aires"
  → System detects it is a "multi-neighborhood city" (in curated list)
  → Shows CityOverview page: neighborhood grid
  → User clicks a neighborhood card
  → Navigates to /city/palermo (existing flow, scoped bbox)
  → Pays $5 to unlock that neighborhood
  OR
  → Pays bundle price to unlock all neighborhoods in the city
```

For cities NOT in the curated list (most cities), flow is unchanged.

---

## Must include

### A. Curated neighborhood data (static JSON / TypeScript config)

File: `src/data/neighborhoods.ts`

For each city, define:
- `citySlug`: matches the geocoded city slug (e.g. "buenos-aires")
- `neighborhoods[]`: array of 4–6 neighborhoods, each with:
  - `name`: display name (e.g. "Palermo")
  - `slug`: URL slug (e.g. "palermo")
  - `lat`, `lon`: center coordinates
  - `bbox`: bounding box (Nominatim-derived, in [south, west, north, east] order)
  - `tagline`: one-line description for remote workers (e.g. "Café-dense, coworking options, lively but workable")
  - `directionFromCenter`: "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | "Center"
  - `distanceFromCenterKm`: rough distance from city center

Start with these cities:
- Buenos Aires (Palermo, San Telmo, Villa Crespo, Recoleta, Belgrano)
- Mexico City (Roma Norte, Condesa, Polanco, Juárez, Del Valle)
- Bangkok (Ekkamai/Thonglor, Ari, Silom, Sukhumvit, Lat Phrao)
- London (Shoreditch, Brixton, Hackney, Peckham, Dalston)
- Berlin (Mitte, Neukölln, Prenzlauer Berg, Kreuzberg, Friedrichshain)
- Lisbon (Mouraria, Intendente, Belém, Alcântara — add to existing city flow)

### B. City overview mode detection

In `city/[slug]/page.tsx`:

- After resolving the city, check if `city.slug` exists in the neighborhood config.
- If yes AND the search was for the full city (not a specific neighborhood):
  - Render `<CityNeighborhoodGrid>` instead of the full `<CityContent>` Suspense block.
- If no match, render current flow unchanged.

Detection rule:
- `city.slug` is in the curated list AND `city.parentCity` is undefined (meaning
  the user searched the city, not an area within it).

### C. `CityNeighborhoodGrid` component

`src/components/CityNeighborhoodGrid.tsx` (client component)

Shows:
- Eyebrow: "Choose your base in [City]"
- Subtitle: "Pick a neighborhood to see work spots, cafés, and training options"
- Grid of neighborhood cards (2 columns mobile, 3 columns desktop)

Each **neighborhood card** shows:
- Neighborhood name (bold)
- Tagline (one line, muted)
- Direction + distance pill: e.g. "N · 3 km from center"
- Routine score badge — shown as a loading skeleton initially, then filled in
  via a lightweight client-side fetch to `/api/city-data` if desired,
  OR omit score from cards and show it only after navigating (keep it simple for MVP)
- CTA: "View setup →" (navigates to /city/[neighborhood-slug] with bbox params)

**Do NOT embed a full map.** Show direction/distance only.

Optional (if time allows): a simple SVG dot-grid showing relative neighborhood
positions on a 3×3 compass grid. Pure SVG, no external tiles or map library.

### D. Bundle unlock pricing

New Stripe price: `CITY_BUNDLE_PRICE_ID` in `.env.local`.

`NEXT_PUBLIC_CITY_BUNDLE_PRICE` for display (e.g. "18").

In `CityNeighborhoodGrid`, show below the grid:
- "Or unlock all [City] neighborhoods — $18"
- Button triggers bundle checkout

### E. Unlock inheritance for bundles

When a city bundle is purchased:
- The finalize route (`/api/checkout/finalize`) reads a new metadata field:
  `bundleCitySlug` (set by the checkout API)
- Sets a cookie `ts_bundle_[citySlug]` with HMAC signature
- `isUnlocked` helper updated to check:
  1. Direct slug cookie (existing)
  2. Parent city bundle cookie (new) — check if `city.parentCity` or slug prefix
     matches any bundle cookie

### F. URL / routing
- Neighborhood pages use existing `/city/[slug]` route — no new routes needed.
- Navigation from the grid passes full params: lat, lon, name, country, parentCity, bbox.
- The city overview page at `/city/buenos-aires` shows the grid.
- A neighborhood page at `/city/palermo` (with parentCity=Buenos Aires) shows the
  existing place layout.

---

## Constraints
- Do NOT embed a real map (no Mapbox, no Google Maps embed, no Leaflet).
- Do NOT auto-fetch routine scores for all neighborhoods on load — it would be
  6 parallel Overpass calls. Either omit scores from cards or fetch lazily.
- Do NOT break the existing city flow for non-listed cities.
- Neighborhood data is static/curated — do not auto-generate from OSM.
- Bundle pricing is additive — do not remove the per-neighborhood unlock.
- Keep the neighborhood card UI consistent with existing PlaceCard style.

---

## Done when
- Searching "Buenos Aires" shows the neighborhood grid (not a scattered place list).
- Searching "El Poblado" (a neighborhood) still shows the existing place layout.
- Each neighborhood card links to the correct scoped city page.
- Searching a small city like Chiang Mai still works exactly as before.
- Bundle unlock option is visible below the grid.
- A user who pays the bundle can access all neighborhoods without a second paywall.
- Build and lint pass cleanly.

---

## Open questions (decide before implementing)

1. **Routine score on cards?** — Computing it requires 6 Overpass calls on load.
   Recommendation: skip for MVP, show only after navigating to the neighborhood.

2. **SVG compass grid?** — Adds clarity but is extra work.
   Recommendation: start with just direction + distance text, add SVG later.

3. **Bundle price?** — $15 or $18? Consider that individual is $5 × 5 neighborhoods = $25.
   $15 feels like a good bundle discount.

4. **Which cities get the grid?** — Start with 6 major cities, expand based on usage.
