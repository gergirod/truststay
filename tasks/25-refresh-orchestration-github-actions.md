# Task 25 — Refresh Orchestration (GitHub Actions + SWR)

## Objective
Implement scheduled refresh for volatile signals and stale-while-revalidate serving behavior.

## Strategy
- Canonical micro-areas: slow refresh (weekly/monthly or anomaly-triggered).
- Volatile place metrics (reviews/ratings/hours): frequent refresh (6h/12h/24h by traffic tier).
- Runtime: serve cached payload fast; enqueue background refresh when stale.

## Deliverables
- GitHub Actions workflows:
  1. `refresh-volatile-metrics.yml` (scheduled)
  2. `refresh-structural-zones.yml` (scheduled)
  3. `refresh-destination.yml` (`workflow_dispatch` manual)
- Job runner service writes status to `refresh_jobs`.
- Cache invalidation hooks after successful refresh:
  - destination-level payload
  - stay-fit narrative cache keys affected by destination

## SWR contract
- Fresh cache: return cache.
- Stale cache: return stale + enqueue async refresh.
- Missing cache: compute synchronously once and cache.

## Constraints
- No blocking runtime fetch loops.
- Respect API quotas and include retry/backoff.

## Done when
- Scheduled workflows run successfully in CI.
- Manual destination refresh works.
- Logs show stale-hit -> async refresh -> cache updated flow.
