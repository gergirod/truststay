# 001 — Goals and Non-Goals

## Business goals

1. BestBaseCard becomes the primary reason to unlock — the output is worth $9
2. The recommendation is specific enough that a user would trust it to choose an Airbnb
3. The system works for any destination we onboard, not just curated ones
4. Thin destinations (Popoyo) return honest, useful output — never fake completeness

## Product goals

1. Parse user intent from URL params or natural language into `UserProfile`
2. Derive `DecisionWeights` from intent — not hardcoded, driven by what the user said
3. Discover 2–4 micro-areas per destination with real evidence
4. Score each micro-area on 9 dimensions with hard + soft penalties
5. Rank micro-areas deterministically — same inputs always produce same ranking
6. Explain the ranking in honest, specific language grounded in real data
7. Flag what is unknown rather than filling gaps with assumptions silently

## Technical goals

1. Strongly typed end to end — no `any`, no silent coercions
2. Zod schemas validate all boundaries — inputs and outputs
3. Pure functions where possible — scoring is deterministic and testable
4. Mockable infrastructure — providers can swap between stub and live
5. Fixtures first — Popoyo works completely offline with deterministic data
6. Extensible to new destinations without touching the scoring core

## Explicit non-goals (v1)

| Non-goal | Why not |
|----------|---------|
| Full-trip planning | Out of scope — destination is already chosen |
| Hotel/Airbnb booking | Third-party problem |
| Community reviews | Too slow to bootstrap; use Google reviews instead |
| Real-time data | Hourly freshness is not worth the cost; 30-day cache is fine |
| Mobile app | Web-first |
| User accounts / saved recommendations | Phase 2 |
| Discovering new destinations | Users already have a destination |
| Social features | Out of scope |
| Chat interface | Not needed — structured inputs work better |
| Multi-destination comparison | Out of scope for v1 |
| Pricing accuracy | Best-effort from websites — always cite source |

## Version 1 boundaries

- Input: `StayIntent` (purpose, workStyle, dailyBalance) + destination
- Micro-areas: 2–4 per destination, from fixtures or Google discovery
- Scoring: 9 dimensions, fixed weight defaults + intent-based adjustments
- Evidence: Google Places data + website extraction + reviews
- Output: structured JSON matching `FinalOutputSchema`
- Integration: feeds `narrativeText` in `BestBaseCard`
- Destinations at launch: those already in `CURATED_NEIGHBORHOODS` + thin-destination fallback
