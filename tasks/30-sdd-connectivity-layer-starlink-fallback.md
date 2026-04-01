# Task 30 - SDD Connectivity Layer + Starlink Fallback

## Owner
- Primary: TBD
- Reviewer: TBD

## Status
- [x] Not started
- [ ] In progress
- [ ] In review
- [ ] Done

## Purpose
Deliver a trustworthy remote-work connectivity decision layer with explainable scoring and separate Starlink fallback context.

## Spec Reference
- `specs/sdd-connectivity-layer-starlink-fallback.md`

## Workstreams

### W1 - Data Model + Precompute Pipeline
- Add connectivity cell/profile entities.
- Build ingestion + median/confidence/score precompute flow.
- Persist `remote_work_bucket` and freshness/confidence metadata.

### W2 - Connectivity APIs
- Implement bbox cell query endpoint.
- Implement area and point summary endpoints.
- Ensure responses include score, bucket, confidence, freshness, source metadata, and summary text.

### W3 - Map Layer UX
- Add connectivity layer toggle (default ON).
- Render grid/polygon cells with bucket colors and legend.
- Add hover quick stats + click richer detail panel.

### W4 - Agent Interpretation
- Implement deterministic summary generator (`summary_short`, `summary_long`, `warnings`).
- Integrate area summary into city-level agent context.

### W5 - Starlink Fallback
- Add separate Starlink module and endpoint.
- Add toggle (default OFF) and fallback badge labels.
- Keep Starlink separate from terrestrial score computation.

### W6 - Sparse Data + Performance
- Add broader-geo fallback with lower confidence/provenance.
- Add caching for precomputed summaries.
- Verify hover/click map interaction latency under typical payloads.

## Acceptance Gate
- AC1..AC6 from `specs/sdd-connectivity-layer-starlink-fallback.md` must pass before marking done.

## Deliverables
- Schema + migration for connectivity entities.
- Precompute scoring pipeline.
- Connectivity + Starlink APIs.
- City map layer with tooltip/detail panel and legend.
- Validation notes and rollout checklist.
