# SDD Connectivity Layer + Starlink Fallback

## Objective
Add a production-ready connectivity decision layer for remote workers that provides map visualization, precomputed scoring, explainable summaries, and separate Starlink fallback context.

## User
Remote worker choosing a base area who needs to assess whether internet is reliable for calls, deep work, uploads, and resilience.

## Jobs To Be Done
- Understand likely internet quality for a neighborhood before booking.
- Compare areas quickly with practical, confidence-aware guidance.
- Know whether Starlink can be considered as backup context.

## Non-goals (v1)
- Mobile carrier comparison.
- Live user device speed tests.
- Accommodation-level Wi-Fi verification.
- Crowd internet review system.
- ML-heavy scoring models.

## Scope
1. Precomputed terrestrial connectivity scoring pipeline.
2. Mapbox connectivity layer using grid/polygon cells.
3. Hover/click tooltip and detail card with practical recommendation copy.
4. Agent-ready interpretation object + summary text.
5. Separate Starlink fallback indicator (not mixed into terrestrial score).

## Functional Requirements

### FR1: Connectivity scoring pipeline
- Ingest normalized observations by geographic cell/neighborhood.
- Compute per-cell metrics:
  - `median_download_mbps`
  - `median_upload_mbps`
  - `median_latency_ms`
  - `sample_count`
  - `freshness_days`
  - `confidence_score`
  - `confidence_bucket`
  - `remote_work_score` (0-100)
  - `remote_work_bucket` (`excellent` | `good` | `okay` | `risky`)
- Store precomputed outputs for fast map/API reads.

### FR2: Connectivity map layer
- Render polygon/grid cells (primary UX), not blur-only heatmap.
- Color cells by `remote_work_bucket`.
- Support hover quick stats + click detail state.
- Optional: heatmap only as secondary far-zoom exploration mode.

### FR3: Connectivity detail UX
- Hover/click exposes:
  - score `/100`
  - median download/upload/latency
  - confidence bucket
  - freshness days
  - practical recommendation text
- Copy avoids guarantees and telecom jargon.

### FR4: Agent-ready interpretation layer
- Expose summary object:
  - `score`, `bucket`, `medians`, `confidence`, `freshness_days`
  - `summary_short`, `summary_long`
  - `warnings[]`
- Summary must be deterministic from computed metrics + confidence.

### FR5: Starlink fallback signal
- Expose separate `StarlinkFallback` object:
  - `status`
  - `source_confidence`
  - `notes[]`
  - `display_label`
- Do not fold Starlink into `remote_work_score` by default.
- UI presents Starlink as backup/resilience context only.

### FR6: Sparse data degradation
- If local cell coverage is sparse, fallback to broader geography.
- Lower confidence and include provenance metadata.
- Keep the UI and agent summary explicit about data limitations.

## Scoring Logic (v1 heuristic)

### Remote work score weights
- 40% median download
- 20% median upload
- 25% median latency
- 15% confidence + freshness

### Bucket thresholds
- `85-100`: `excellent`
- `70-84`: `good`
- `50-69`: `okay`
- `0-49`: `risky`

### Confidence behavior
- Increase with sample size, recency, and lower variance.
- Decrease with sparse/stale/high-variance observations.

## Data Model

### `ConnectivityCell`
- `id`
- `geojson` (Polygon or MultiPolygon)
- `centroid`
- `median_download_mbps`, `median_upload_mbps`, `median_latency_ms`
- `sample_count`, `freshness_days`
- `confidence_score`, `confidence_bucket`
- `remote_work_score`, `remote_work_bucket`
- `source_name`, `source_version`, `computed_at`

### `AreaConnectivityProfile`
- `area_id`
- `best_cell_id`
- `summary` (connectivity summary object)
- `starlink_fallback` (nullable)

## API Surface (target)
- `GET /api/connectivity/cells?bbox=...`
- `GET /api/connectivity/area/:id`
- `GET /api/connectivity/summary?lat=...&lng=...`
- `GET /api/connectivity/starlink?lat=...&lng=...`

Responses include metrics, score, bucket, confidence, freshness, source metadata, and summary text.

## Performance Requirements
- Serve map-friendly geometry payloads only.
- Support bbox queries and avoid shipping raw heavy datasets.
- Cache precomputed summaries for fast hover/click interactions.
- Keep map hover latency low and deterministic.

## Acceptance Criteria

### AC1: Map visibility
- User opens destination map and sees a connectivity layer by cell/polygon.

### AC2: Explainable detail
- Hover/click reveals score, medians, confidence, freshness, and recommendation.

### AC3: Agent summary
- System returns structured connectivity summary text for any visible area.

### AC4: Starlink separation
- Starlink appears as independent fallback context, not blended into terrestrial score.

### AC5: Graceful sparse-data fallback
- Sparse zones use broader fallback geography and reduced confidence with provenance.

### AC6: Product language quality
- UI copy stays practical and avoids guarantees/jargon.

## Telemetry Requirements
- `connectivity_layer_toggled`
- `connectivity_cell_hovered`
- `connectivity_cell_opened`
- `connectivity_summary_requested`
- `starlink_layer_toggled`
- `starlink_status_viewed`

## Implementation Mapping (target files)
- `src/db/schema.ts` (new connectivity entities)
- `src/db/repositories/*` (connectivity read/write paths)
- `src/lib/connectivity/*` (scoring + summarization)
- `src/lib/starlink/*` (fallback provider adapter)
- `src/app/api/connectivity/*` (API routes)
- `src/components/CityMap.tsx` (map layer + interactions)
- `src/components/*Connectivity*` (legend/detail card/toggles)
