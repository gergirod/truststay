# Task 24 — Canonical Repositories + Read Models

## Objective
Add repository interfaces and read models so the agent/runtime can query canonical data in one call pattern.

## Deliverables
- Repository interfaces for:
  - destinations
  - micro areas
  - aliases
  - place metrics
  - refresh jobs
- Drizzle-backed repository implementations.
- Read model builder:
  - `getCanonicalDestinationContext(slug, activity)` returns:
    - destination anchor
    - canonical micro-areas
    - alias map
    - latest place metrics freshness summary

## Agent-oriented requirements
- Every returned fact includes:
  - `source`
  - `refreshed_at` or `last_verified_at`
  - `confidence`
- Alias resolution supports:
  - discovered name -> canonical micro area id
  - canonical id -> display name

## Constraints
- Do not switch `buildFinalResponse` logic yet.
- Keep existing dynamic discovery path intact.

## Done when
- Read model can be fetched for a seeded destination.
- Alias mapping works for known variants (example: generic/discovered labels to canonical zone ids).
- Unit tests cover repository basic CRUD and alias resolution.
