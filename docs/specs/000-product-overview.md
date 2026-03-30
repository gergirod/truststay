# 000 — Product Overview

## What this product is

TrustStay is a location intelligence engine for remote workers who have already chosen a destination.

It answers one question: **Where exactly should I base myself — and why?**

Not "where should I go next." Not "is this place good?" The destination is already chosen. The user is going to Popoyo. The question is: which micro-area inside Popoyo gives them the best shot at their specific combination of surf + work + routine continuity.

## Why it exists

The standard trip-planning stack fails remote workers in a specific way:

1. They search Google Maps for coworkings
2. They find 2 options, book an Airbnb that looks nice
3. They land and discover the coworking is 35 min away, the cafe has no wifi, the gym doesn't exist, and the surf break is only accessible by scooter they don't have yet
4. Week 1 is wasted figuring out where to actually work

The problem is not information scarcity — it's decision fragmentation. The remote worker has to manually integrate surf proximity + wifi quality + food walkability + noise level + gym access into a single "should I stay here" judgment.

TrustStay makes that judgment structured, explicit, and grounded in real evidence.

## Who it is for

Remote workers who travel with a **purpose + work combination**:
- Going somewhere to surf (or dive, hike, ski, etc.) **and** maintain their remote job
- Care about keeping their productivity routine intact
- Typically stay 1–4 weeks
- Research before they go — not while they're there

They are not:
- Pure leisure tourists
- Digital nomads who live nomadically full-time (though they benefit too)
- People without work obligations

## The core problem it solves

**Micro-area selection under competing constraints.**

The destination is Popoyo. But Popoyo has:
- Guasacate (main surf village, walkable to break, thin work infra)
- South Playa Popoyo (quieter, bigger resorts, driving required for work)
- Santana / Rancho Santana (premium, bundled infra, surf + work in one property)

Choosing the wrong micro-area costs you a week. Choosing right means day 1 you're functional.

The engine evaluates each micro-area on 9 dimensions weighted by the user's actual intent, flags hard constraint violations, explains tradeoffs, and names the winner.

## The main user promise

> You already chose the place. We tell you exactly where to base yourself — and what to plan around before you land.

## Examples of good outputs

**Good**: "Guasacate is the right base for your surf + light-work stay. Waves & Wifi coliving ($50/night, workspace included) solves the surf + work bundling problem. Kooks Cafe opens at 7am and has reliable wifi. No grocery within walking distance — plan a weekly run to Rivas or stock up on arrival."

**Good**: "Santana area outranks Guasacate for your surf + heavy-work setup despite higher cost. Rancho Santana has in-house fast internet (per 6 recent reviews), a gym, and restaurant on-site. The surf break is a 5 min walk. For heavy-work weeks you need bundled infrastructure — Guasacate requires assembling it yourself."

## Examples of bad outputs

**Bad**: "Popoyo is a vibrant surf destination perfect for remote workers looking for an authentic experience with stunning waves and charming cafes." (generic, no micro-area, no evidence, no tradeoffs)

**Bad**: "We recommend Guasacate because it has good wifi and is close to the beach." (no evidence, no scoring, no penalties, no constraint check)

**Bad**: Ranking that changes based on nothing (no deterministic scoring, no reproducibility)

## Integration with existing product

The decision engine is **not** a separate product. It is the reasoning layer that powers:
- `BestBaseCard` — receives the engine's `narrativeText` output
- `StayFitResult` — the engine enriches and replaces the current flat scoring
- `placeEnrichmentAgent.ts` — becomes the evidence-collection infrastructure the engine calls

The engine produces a structured `FinalOutput` object. The LLM only explains — it does not decide.
