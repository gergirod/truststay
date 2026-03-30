# 013 — Implementation Plan

## Phase 0 — Folder structure (done)
- `/docs/specs/` — all 13 spec files
- `/src/domain/entities/` — UserProfile, MicroArea, EvidencePack, ScoreCard
- `/src/domain/value-objects/` — DecisionWeights, Penalty, DimensionScores
- `/src/domain/services/` — scoring.service.ts, penalties.service.ts, explainer.service.ts
- `/src/application/use-cases/` — extractIntent, adjustWeights, evaluateMicroArea, rankOptions, generateRecommendation, buildFinalResponse
- `/src/infrastructure/providers/` — mockProvider, googlePlacesProvider, fixtures/
- `/src/schemas/zod/` — all Zod schemas
- `/src/tests/` — all test files

## Phase 1 — Zod schemas (current)

Files:
- `src/schemas/zod/userProfile.schema.ts`
- `src/schemas/zod/decisionWeights.schema.ts`
- `src/schemas/zod/evidencePack.schema.ts`
- `src/schemas/zod/scoreCard.schema.ts`
- `src/schemas/zod/finalOutput.schema.ts`
- `src/schemas/zod/index.ts`

Checkpoint: All schemas pass `tsc --noEmit` and validate example fixtures.

## Phase 2 — Domain model

Files:
- `src/domain/value-objects/decisionWeights.ts`
- `src/domain/value-objects/penalty.ts`
- `src/domain/value-objects/dimensionScores.ts`
- `src/domain/entities/userProfile.ts`
- `src/domain/entities/microArea.ts`
- `src/domain/entities/evidencePack.ts`
- `src/domain/entities/scoreCard.ts`
- `src/domain/entities/recommendation.ts`

Checkpoint: All types consistent with Zod schemas.

## Phase 3 — Scoring core (pure functions)

Files:
- `src/domain/services/scoring.service.ts`
  - `computeDimensionScore(dimension, evidence) → number`
  - `scoreMicroArea(evidencePack, weights, userProfile) → ScoreCard`
- `src/domain/services/penalties.service.ts`
  - `evaluatePenalties(evidencePack, userProfile) → Penalty[]`
- `src/application/use-cases/adjustWeights.ts`
  - `adjustWeights(defaults, userProfile) → DecisionWeights`
- `src/application/use-cases/rankOptions.ts`
  - `rankMicroAreas(scoreCards) → RankingResult`
- `src/data/scoring-config.ts`
  - All weight defaults, penalty configs, threshold constants

Checkpoint: Unit tests for scoring/penalties/ranking pass.

## Phase 4 — Evidence collection infrastructure

Files:
- `src/infrastructure/providers/evidence.provider.ts` — abstract interface
- `src/infrastructure/providers/mock.evidence.provider.ts` — returns fixture data
- `src/infrastructure/providers/google.evidence.provider.ts` — real Google calls
- `src/infrastructure/providers/fixtures/popoyo.ts` — Popoyo fixture

Checkpoint: Mock provider returns valid EvidencePack. Fixture tests pass.

## Phase 5 — Use cases

Files:
- `src/application/use-cases/extractIntent.ts`
- `src/application/use-cases/evaluateMicroArea.ts`
- `src/application/use-cases/generateRecommendation.ts`
- `src/application/use-cases/buildFinalResponse.ts`

Checkpoint: Full flow Popoyo → FinalOutput works with mock provider.

## Phase 6 — API layer

Files:
- `src/app/api/recommendation/route.ts` — POST /api/recommendation
- `src/app/api/recommendation/health/route.ts` — GET /api/health
- `src/infrastructure/http/recommendation.handler.ts` — request validation + use case orchestration

Checkpoint: `POST /api/recommendation` returns valid FinalOutput for Popoyo.

## Phase 7 — Integration with BestBaseCard

Files modified:
- `src/lib/placeEnrichmentAgent.ts` — call recommendation engine, use FinalOutput.recommendation for narration
- `src/app/city/[slug]/page.tsx` — pass FinalOutput to BestBaseCard narrativeText

Checkpoint: BestBaseCard shows richer, structured content for Popoyo.

## Phase 8 — Additional fixtures + tests

Files:
- `src/infrastructure/providers/fixtures/canggu.ts`
- `src/infrastructure/providers/fixtures/ericeira.ts`
- `src/tests/` — all test files

Checkpoint: All test plan cases pass.

## Timeline estimate

| Phase | Effort | Depends on |
|-------|--------|-----------|
| 0 — Specs | Done | — |
| 1 — Schemas | 2h | Specs |
| 2 — Domain model | 1h | Schemas |
| 3 — Scoring core | 3h | Domain model |
| 4 — Evidence infra | 2h | Domain model |
| 5 — Use cases | 2h | Scoring + evidence |
| 6 — API | 1h | Use cases |
| 7 — Integration | 2h | API |
| 8 — Fixtures + tests | 3h | All |
| **Total** | **~16h** | |
