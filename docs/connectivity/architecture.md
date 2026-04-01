# Connectivity Layer - Architecture

## Overview
The connectivity feature is split into two independent signals:

1. **Terrestrial connectivity (primary):**
   - powers scoring, buckets, map cells, and agent reasoning.
2. **Starlink fallback (secondary):**
   - shown as resilience context only.
   - never merged into main score by default.

## Components

## 1) Ingestion + normalization
- Input: normalized connectivity observations per geo cell / area.
- Output: canonical observation rows with timestamps and source metadata.

## 2) Scoring/precompute job
- Reads recent observations per cell.
- Computes medians (download/upload/latency), confidence, freshness, score, bucket.
- Writes precomputed cell payloads + area summaries.

## 3) Connectivity API
- BBox cells for map rendering.
- Area/point summary endpoints for side panel + agent consumption.

## 4) Starlink module
- Adapter that resolves fallback status by location.
- Returns structured status + confidence + notes.

## 5) Frontend map integration
- Adds layer toggles and legend.
- Renders cell polygons.
- Hover: quick stats.
- Click: richer detail panel and recommendation.

## 6) Agent interpretation layer
- Deterministic summarizer from computed metrics.
- Returns short/long practical copy + warnings.

## Data flow
1. Source observations ingested.
2. Precompute job aggregates + scores.
3. API serves compact geometry + summary payload.
4. Map renders by bucket, with hover/click detail.
5. Agent uses area summary and optional Starlink fallback text.

## Reliability constraints
- Precompute first, query many.
- Bbox APIs only ship map-ready geometry.
- Cache area summary for low-latency interactions.
- Sparse data falls back to broader geography with lowered confidence.
