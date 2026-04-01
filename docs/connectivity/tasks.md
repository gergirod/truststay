# Connectivity Layer - Tasks

## Phase order
1. Schema + data contracts
2. Precompute scoring pipeline
3. API endpoints
4. Map layer + UX
5. Agent summary integration
6. Starlink fallback layer
7. Performance + validation

## Checklist
- [ ] Define `connectivity_cells` and `area_connectivity_profiles` tables.
- [ ] Add ingestion contract for normalized observations.
- [ ] Implement score heuristic and bucketing.
- [ ] Implement confidence/freshness scoring.
- [ ] Add sparse-data fallback logic + provenance.
- [ ] Implement `GET /api/connectivity/cells?bbox=...`.
- [ ] Implement `GET /api/connectivity/area/:id`.
- [ ] Implement `GET /api/connectivity/summary?lat=...&lng=...`.
- [ ] Implement `GET /api/connectivity/starlink?lat=...&lng=...`.
- [ ] Add map toggles: Connectivity (ON), Starlink fallback (OFF).
- [ ] Add legend and hover/click detail card.
- [ ] Implement deterministic agent summary generator.
- [ ] Add telemetry for layer toggle/hover/open/summary events.
- [ ] Validate acceptance criteria AC1..AC6.
