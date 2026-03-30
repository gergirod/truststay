# Task 27 — Runtime Cutover + Observability

## Objective
Switch runtime resolution to canonical-first while preserving safe fallback behavior and strong monitoring.

## Deliverables
- `buildFinalResponse` flow update:
  - canonical DB first
  - dynamic discovery fallback only if canonical data missing
  - zone acceptance requires geofence + evidence checks (no unguided zone pass-through)
- `discoverMicroAreas`:
  - alias-aware normalization in fallback mode
  - canonical handoff contract
  - deterministic geofence rejection for out-of-bounds candidates
- Metrics/alerts:
  - zone drift
  - duplicate zone insertion attempts
  - empty evidence packs
  - low-evidence accepted zones (should be near-zero)
  - geofence rejection rate by destination
  - refresh failures and stale windows

## Operational tooling
- Admin endpoint(s):
  - force refresh destination
  - force structural re-evaluation
  - inspect current canonical zones + freshness

## Rollout plan
1. Canary on a small destination set.
2. Compare canonical vs dynamic outputs.
3. Enable globally once drift/error thresholds are acceptable.

## Done when
- Canonical-first runtime is active for all destinations.
- Fallback path is tested and safe.
- Dashboards/alerts provide clear operational visibility.
