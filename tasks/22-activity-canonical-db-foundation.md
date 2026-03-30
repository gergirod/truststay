# Task 22 — Activity Canonical DB Foundation (SDD)

## Objective
Create a canonical data foundation for **all supported activities** (`surf`, `dive`, `hike`, `yoga`, `kite`, `work_first`, `exploring`) so micro-areas are stable over time and volatile place signals are refreshed safely.

## Why
- Dynamic-only discovery causes naming drift and wrong-zone snaps.
- Micro-areas are long-lived and should be persisted as canonical entities.
- Reviews/ratings/hours are volatile and should refresh on schedule.
- Zone suggestions must be grounded in real nearby place evidence, not name-only discovery.
- Geo-fencing is required to avoid cross-destination zone contamination.

## Scope
- Introduce Postgres (Drizzle) as source of truth for canonical entities.
- Keep Upstash KV as serving cache.
- Establish task breakdown for parallel execution.

## Non-goals (this phase)
- Full runtime cutover in one PR.
- Replacing existing map/card UI contracts.
- Live-per-request Google fetch for all places.

## Parallel task map
1. [Task 23 — Canonical schema + Drizzle setup](./23-canonical-schema-and-drizzle-setup.md)
2. [Task 24 — Repository layer + read models](./24-canonical-repositories-and-read-models.md)
3. [Task 25 — Refresh orchestration (GitHub Actions + SWR)](./25-refresh-orchestration-github-actions.md)
4. [Task 26 — Backfill all activity destinations](./26-activity-destination-backfill-and-quality.md)
5. [Task 27 — Runtime cutover + guardrails](./27-runtime-cutover-and-observability.md)

## Contracts to preserve
- `CityMap` still consumes `microAreas[]` with `name`, `center`, `radius_km`, rank/score.
- `MicroAreaStack` still consumes ranked narratives.
- Existing city pages continue to render if DB is unavailable (fallback path).

## Done when
- Tasks 23–27 are completed and merged.
- Canonical DB records exist for all currently supported activity destinations.
- Refresh jobs and cache invalidation are operational.
