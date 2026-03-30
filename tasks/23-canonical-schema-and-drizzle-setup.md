# Task 23 — Canonical Schema + Drizzle Setup

## Objective
Set up Drizzle + Postgres schema for canonical destination/micro-area data and volatile place metrics.

## Deliverables
- Drizzle config + migration pipeline.
- Initial schema tables:
  - `destinations`
  - `micro_areas`
  - `micro_area_aliases`
  - `places`
  - `place_metrics`
  - `micro_area_snapshots`
  - `refresh_jobs`
- Indexes for common lookups:
  - destination slug
  - micro area canonical name
  - alias lookup (`destination_id`, `alias_name`)
  - freshness queries (`refreshed_at`)

## Required fields (minimum)
- `micro_areas`: `canonical_name`, `center_lat`, `center_lon`, `radius_km`, `confidence`, `status`, `last_verified_at`.
- `place_metrics`: `rating`, `review_count`, `opening_hours_json`, `refreshed_at`, `source`.
- `refresh_jobs`: `job_type`, `scope`, `status`, `started_at`, `finished_at`, `error`.

## Constraints
- No runtime resolver cutover here.
- No UI changes.
- Migrations must be repeatable and environment-safe.

## Done when
- Migration runs cleanly locally.
- Schema is checked in and documented.
- Type-safe Drizzle table definitions are available for repository implementation.
