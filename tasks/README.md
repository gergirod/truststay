# Tasks Execution Board (SDD)

## Purpose
This board defines execution order, parallel lanes, ownership, and definition-of-done for the canonical data initiative across all activities.

## Scope
- Activities: `surf`, `dive`, `hike`, `yoga`, `kite`, `work_first`, `exploring`
- Persistence strategy:
  - Long-term: canonical geography and aliases
  - Medium-term: place metrics and evidence snapshots
  - Short-term: serving cache payloads

## Execution Order
1. [Task 22 — Activity Canonical DB Foundation](./22-activity-canonical-db-foundation.md)
2. [Task 23 — Canonical Schema + Drizzle Setup](./23-canonical-schema-and-drizzle-setup.md)
3. [Task 24 — Canonical Repositories + Read Models](./24-canonical-repositories-and-read-models.md)
4. [Task 25 — Refresh Orchestration (GitHub Actions + SWR)](./25-refresh-orchestration-github-actions.md)
5. [Task 26 — Activity Destination Backfill + Quality Gates](./26-activity-destination-backfill-and-quality.md)
6. [Task 27 — Runtime Cutover + Observability](./27-runtime-cutover-and-observability.md)

## Parallelization Plan
- Lane A (Platform):
  - Task 23
  - Task 25
- Lane B (Domain Data):
  - Task 24
  - Task 26
- Lane C (Integration):
  - Task 27 (starts after Task 23 + Task 24 minimal readiness)

## Ownership Template
Copy for each task:

```md
## Owner
- Primary: <name>
- Reviewer: <name>

## Status
- [ ] Not started
- [ ] In progress
- [ ] In review
- [ ] Done

## Dependencies
- <task ids>

## PR
- <url>
```

## PR Strategy
- One task per PR where possible.
- Keep migrations isolated from runtime behavior changes.
- For runtime cutover, use a feature flag or fallback guard.

## Acceptance Checklist (Global)
- Canonical zone names are stable across reruns.
- Drift and duplicate protections are active.
- Refresh jobs update volatile data without blocking page render.
- Cache invalidation is tied to refresh completion.
- All activities are covered in backfill and QA.

## Suggested Milestones
- Milestone 1: Task 23 + Task 24 merged.
- Milestone 2: Task 25 merged with first successful scheduled run.
- Milestone 3: Task 26 backfill report approved.
- Milestone 4: Task 27 canary complete, full cutover enabled.

## Current UX/UI Sprint (SDD)
- [Task 28 - SDD UX Utility Sprint](./28-sdd-ux-utility-sprint.md)
