# Task 26 — Activity Destination Backfill + Quality Gates

## Objective
Seed canonical records for all current activity destinations and add quality gates to prevent bad zone capture.

## Core rule
Micro-area suggestions must be **evidence-grounded**:
- candidate zones are accepted only when supported by nearby place evidence (discovered venues + Google Places signals),
- and pass geo-fencing validation relative to destination anchor/bounds.

## Scope
- Backfill all supported activity clusters:
  - surf
  - dive
  - hike
  - yoga
  - kite
  - work-first
  - exploring

## Deliverables
- Backfill script/process that:
  1. runs dynamic discovery
  2. validates each candidate zone against geo-fence constraints
  3. verifies zone evidence from discovered places + Google review/rating density
  4. resolves aliases to canonical names
  5. writes canonical micro-areas
  6. writes initial place metrics snapshot
- Quality gates:
  - geo-fence distance threshold
  - duplicate zone proximity threshold
  - business-name rejection for zone names
  - evidence minimums (e.g. min nearby places/review density thresholds)
  - min viable zone count per destination

## Review workflow
- Generate review report per destination:
  - proposed canonical zones
  - geofence pass/fail per zone with distance from anchor
  - evidence summary per zone (nearby places, ratings, review counts, source freshness)
  - aliases captured
  - confidence and anomalies
- Allow manual acceptance/override before publish.

## Done when
- All current destinations have canonical entries.
- Quality checks pass for all entries.
- Manual QA confirms key destinations (including Popoyo/Santa Teresa class cases) are stable.
