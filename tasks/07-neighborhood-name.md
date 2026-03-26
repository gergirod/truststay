# Task 07 — Real Neighborhood Name for Suggested Base Area

## Objective
Replace the generic "Central {city}" label with the actual neighborhood or district
name derived from reverse geocoding the computed work-cluster centroid.

## Problem
`recommendedArea` is currently hardcoded as `"Central ${city.name}"`.
The centroid coordinates are already computed — they are just never converted
into a real place name. Users see "Central Medellín" or "Central Lisboa" which
communicates nothing useful about where to actually base themselves.

## Must include
- `reverseGeocodeArea(lat, lon): Promise<string | null>` added to `src/lib/geocode.ts`
  - calls Nominatim reverse endpoint: `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json&zoom=16`
  - returns the most specific name available in this priority order:
    1. `address.neighbourhood`
    2. `address.suburb`
    3. `address.quarter`
    4. `address.city_district`
    5. `null` (caller falls back to "Central {city.name}")
  - must respect Nominatim User-Agent header (already set elsewhere)
  - must not throw — return null on any failure
- `computeCitySummary` updated to accept an optional `areaName?: string` parameter
  - if provided and non-empty, use it as `recommendedArea`
  - if absent, fall back to current `"Central ${city.name}"` behavior
- `CityContent` in `city/[slug]/page.tsx` updated to:
  - call `reverseGeocodeArea` using the already-computed `baseCentroid`
  - if no centroid (< 3 work places), skip the reverse geocode
  - pass the resolved name to `computeCitySummary`

## Constraints
- Do not add a new API dependency — Nominatim is already used for forward geocoding
- Do not cache aggressively — Nominatim reverse results can be cached same as forward (`next: { revalidate: 86400 }`)
- Do not surface raw coordinates or compass directions to the user
- If the reverse geocode fails or returns nothing useful, fall back silently — never show null or undefined

## Done when
- Searching Lisboa shows "Bairro Alto" or a real district name instead of "Central Lisboa"
- Searching Medellín shows "El Poblado" or similar instead of "Central Medellín"
- If reverse geocode fails, the app still works and shows the generic fallback
