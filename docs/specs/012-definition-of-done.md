# 012 — Definition of Done

## v1 is done when:

### Specs
- [ ] All 13 spec files written
- [ ] Domain model fully defined with invariants
- [ ] Tool contracts defined (not just vague interfaces)
- [ ] Output schema committed as JSON Schema + Zod

### Schemas
- [ ] `UserProfileSchema` implemented with Zod
- [ ] `DecisionWeightsSchema` with sum-to-1 validation
- [ ] `EvidencePackSchema` with all sub-evidence types
- [ ] `ScoreCardSchema` with penalty array
- [ ] `FinalOutputSchema` matching JSON schema
- [ ] No `any` types anywhere in schemas

### Scoring engine
- [ ] `adjustWeights()` pure function, tested
- [ ] `scoreMicroArea()` pure function, tested
- [ ] `penaltiesService.evaluate()` tested
- [ ] `rankMicroAreas()` deterministic, tested
- [ ] All penalties configurable in `scoring-config.ts`
- [ ] All defaults centralized (no magic numbers in logic)

### Evidence collection
- [ ] All collector interfaces defined
- [ ] Mock/fixture providers implemented for Popoyo
- [ ] Live providers (Google Places) implemented
- [ ] Provider swap is a 1-line change per collector

### Fixtures
- [ ] Popoyo fixture with 3 micro-areas
- [ ] Each micro-area has complete `EvidencePack`
- [ ] Fixture data is realistic (sourced from real Google data)
- [ ] At least 1 additional destination (Canggu or Ericeira)

### Tests
- [ ] `extractIntent` tests pass
- [ ] `adjustWeights` tests pass (sum = 1.0 for all profiles)
- [ ] `scoreMicroArea` tests pass (Guasacate wins for balanced surf+work)
- [ ] Penalty tests pass
- [ ] Ranking tests pass (constraint_breakers demoted)
- [ ] Schema validation tests pass
- [ ] Edge case tests pass (unknown budget, unknown transport)

### API
- [ ] `POST /api/recommendation` returns valid `FinalOutput`
- [ ] `GET /api/health` returns 200
- [ ] All outputs validated before return (Zod parse)
- [ ] No silent failures — all errors surfaced in response

### Integration with BestBaseCard
- [ ] `FinalOutput.recommendation` maps to `narrativeText` shape
- [ ] BestBaseCard renders correctly with new output
- [ ] Low confidence flag correctly triggers disclosure
- [ ] Existing `StayFitResult` still powers score display

### Quality
- [ ] `tsc --noEmit` passes with 0 errors
- [ ] No `any` types
- [ ] No magic numbers outside `scoring-config.ts`
- [ ] All assumptions surfaced in `FinalOutput.assumptions`
- [ ] All unknowns surfaced in `FinalOutput.unknowns`
