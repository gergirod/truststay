# Connectivity Layer - Implementation Plan

## Milestone 1 - Contracts + schema
- Define TypeScript contracts for:
  - `ConnectivityCell`
  - `ConnectivitySummary`
  - `AreaConnectivityProfile`
  - `StarlinkFallback`
- Add DB tables/migration for precomputed cells and area summaries.
- DoD:
  - migration applies successfully
  - repository read/write tests pass

## Milestone 2 - Scoring engine
- Implement median metric aggregation.
- Implement score heuristic:
  - download 40%
  - upload 20%
  - latency 25%
  - confidence+freshness 15%
- Implement bucket thresholds (`excellent`, `good`, `okay`, `risky`).
- DoD:
  - deterministic test fixtures match expected score/bucket

## Milestone 3 - Sparse fallback + confidence
- Add fallback from small cell to broader geography.
- Attach provenance and lower confidence where fallback is used.
- DoD:
  - sparse data test cases return lower confidence and warnings

## Milestone 4 - APIs
- Add endpoints:
  - `/api/connectivity/cells?bbox=...`
  - `/api/connectivity/area/:id`
  - `/api/connectivity/summary?lat=...&lng=...`
  - `/api/connectivity/starlink?lat=...&lng=...`
- DoD:
  - response contracts validated
  - payloads include source metadata and summary text

## Milestone 5 - Map UX
- Add layer toggles (Connectivity ON, Starlink OFF).
- Render polygon/grid layer by bucket colors.
- Add hover quick stats and click side panel.
- Add legend copy and practical recommendation language.
- DoD:
  - interactions remain fast with bbox payloads

## Milestone 6 - Agent integration
- Add interpretation helper for short/long summary + warnings.
- Integrate into city planning context so agent can mention connectivity and fallback appropriately.
- DoD:
  - summaries are practical, confidence-aware, and deterministic

## Milestone 7 - Rollout + validation
- Add telemetry events for layer usage and summary requests.
- Validate AC1..AC6 from SDD spec.
- Document operational runbook and rollback path.
- DoD:
  - acceptance checklist complete
  - launch notes ready
