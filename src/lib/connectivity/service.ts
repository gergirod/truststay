import { canonicalRepository, connectivityRepository } from "@/db/repositories";
import { buildConnectivitySummary, computeConnectivityCells } from "@/lib/connectivity/scoring";
import { deriveStarlinkFallbackByLatLon } from "@/lib/connectivity/starlink";
import type {
  ConnectivityCellComputed,
  ConnectivitySummary,
  NormalizedConnectivityObservation,
} from "@/lib/connectivity/types";

function hashNumber(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h +=
      (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); // FNV-ish
  }
  return Math.abs(h >>> 0);
}

function allowSeededConnectivityData(): boolean {
  // Default ON so destinations without observed internet samples still get
  // a usable baseline layer. Can be disabled explicitly via env.
  if (process.env.CONNECTIVITY_ALLOW_SEEDED === "false") return false;
  return true;
}

interface SeedCoverageBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  centerLat: number;
  centerLon: number;
}

function deriveSeedCoverageBounds(params: {
  centerLat: number;
  centerLon: number;
  microAreas: Array<{ centerLat: number; centerLon: number; radiusKm: number }>;
}): SeedCoverageBounds {
  const { centerLat, centerLon, microAreas } = params;
  if (!microAreas.length) {
    return {
      minLat: centerLat - 0.02,
      maxLat: centerLat + 0.02,
      minLon: centerLon - 0.02,
      maxLon: centerLon + 0.02,
      centerLat,
      centerLon,
    };
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;

  for (const area of microAreas) {
    const latR = area.radiusKm / 110.57;
    const lonR = area.radiusKm / (111.32 * Math.max(0.35, Math.cos((area.centerLat * Math.PI) / 180)));
    minLat = Math.min(minLat, area.centerLat - latR);
    maxLat = Math.max(maxLat, area.centerLat + latR);
    minLon = Math.min(minLon, area.centerLon - lonR);
    maxLon = Math.max(maxLon, area.centerLon + lonR);
  }

  return {
    minLat: minLat - 0.004,
    maxLat: maxLat + 0.004,
    minLon: minLon - 0.004,
    maxLon: maxLon + 0.004,
    centerLat: (minLat + maxLat) / 2,
    centerLon: (minLon + maxLon) / 2,
  };
}

function generateSeededObservations(params: {
  destinationId: string;
  destinationSlug: string;
  bounds: SeedCoverageBounds;
}): NormalizedConnectivityObservation[] {
  const { destinationId, destinationSlug, bounds } = params;
  const seed = hashNumber(destinationSlug);
  const rows: NormalizedConnectivityObservation[] = [];
  const latSpan = Math.max(0.015, bounds.maxLat - bounds.minLat);
  const lonSpan = Math.max(0.015, bounds.maxLon - bounds.minLon);
  const rowCount = Math.max(3, Math.min(8, Math.round(latSpan / 0.01)));
  const colCount = Math.max(3, Math.min(8, Math.round(lonSpan / 0.01)));
  const latStep = latSpan / rowCount;
  const lonStep = lonSpan / colCount;
  let idx = 0;
  for (let y = 0; y < rowCount; y += 1) {
    for (let x = 0; x < colCount; x += 1) {
      const cellKey = `${destinationSlug}:c${idx}`;
      const cLat = bounds.minLat + latStep * (y + 0.5);
      const cLon = bounds.minLon + lonStep * (x + 0.5);
      const xDist = Math.abs(cLon - bounds.centerLon) / Math.max(lonSpan * 0.5, 0.0001);
      const yDist = Math.abs(cLat - bounds.centerLat) / Math.max(latSpan * 0.5, 0.0001);
      const base = 76 - xDist * 13 - yDist * 11 + (seed % 6);
      for (let s = 0; s < 8; s += 1) {
        const jitter = ((seed + idx * 17 + s * 13) % 9) - 4;
        const quality = Math.max(28, Math.min(94, base + jitter));
        const observedAt = new Date(
          Date.now() - ((seed + s * 3 + idx) % 21) * 24 * 60 * 60 * 1000,
        ).toISOString();
        rows.push({
          destinationId,
          cellKey,
          lat: cLat + (jitter * 0.00015),
          lon: cLon + (jitter * 0.00013),
          downloadMbps: Math.max(6, Math.round(quality * 1.65)),
          uploadMbps: Math.max(2, Math.round(quality * 0.52)),
          latencyMs: Math.max(22, Math.round(136 - quality)),
          observedAt,
          sourceName: "seeded_v1",
          sourceVersion: "1",
        });
      }
      idx += 1;
    }
  }
  return rows;
}

function toSummary(cell: ConnectivityCellComputed): ConnectivitySummary {
  return buildConnectivitySummary({
    score: cell.remote_work_score,
    bucket: cell.remote_work_bucket,
    median_download_mbps: cell.median_download_mbps,
    median_upload_mbps: cell.median_upload_mbps,
    median_latency_ms: cell.median_latency_ms,
    confidence: cell.confidence_bucket,
    freshness_days: cell.freshness_days,
  });
}

function distanceSq(aLat: number, aLon: number, bLat: number, bLon: number): number {
  return (aLat - bLat) ** 2 + (aLon - bLon) ** 2;
}

const INTERNET_CELL_ANCHOR_MAX_KM = 1.6;
const INTERNET_CELL_AREA_RADIUS_FACTOR = 1.05;

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function isInsideAnyMicroArea(
  lat: number,
  lon: number,
  areas: Array<{ centerLat: number; centerLon: number; radiusKm: number }>,
): boolean {
  if (areas.length === 0) return true;
  return areas.some((a) =>
    haversineKm(lat, lon, a.centerLat, a.centerLon) <= Math.max(0.35, a.radiusKm * INTERNET_CELL_AREA_RADIUS_FACTOR),
  );
}

function isNearAnyPlaceAnchor(
  lat: number,
  lon: number,
  anchors: Array<{ lat: number; lon: number }>,
  maxKm: number,
): boolean {
  if (anchors.length === 0) return true;
  return anchors.some((p) => haversineKm(lat, lon, p.lat, p.lon) <= maxKm);
}

export async function ensureConnectivityPrecomputedForCitySlug(
  citySlug: string,
  options?: { forceRecompute?: boolean },
): Promise<{ ok: boolean; cellCount: number }> {
  const forceRecompute = options?.forceRecompute === true;
  const destination = await canonicalRepository.getDestinationBySlug(citySlug);
  if (!destination) return { ok: false, cellCount: 0 };
  const areas = await canonicalRepository.listMicroAreasForDestination(destination.id);
  const placeAnchors = await canonicalRepository.listPlaceAnchorsForDestination(destination.id);

  const existingCount = await connectivityRepository.countCellsForDestination(destination.id);
  if (!forceRecompute && existingCount > 0) return { ok: true, cellCount: existingCount };

  let observations = await connectivityRepository.listObservationsForDestination(destination.id);
  if (!observations.length) {
    if (!allowSeededConnectivityData()) {
      console.warn(
        `[connectivity] seeded disabled city=${citySlug} destination=${destination.id} and no observations found`,
      );
      return { ok: true, cellCount: 0 };
    }
    console.log(
      `[connectivity] seeding observations city=${citySlug} destination=${destination.id}`,
    );
    const centerLat = destination.anchorLat ?? 0;
    const centerLon = destination.anchorLon ?? 0;
    const bounds = deriveSeedCoverageBounds({
      centerLat,
      centerLon,
      microAreas: areas.map((a) => ({
        centerLat: a.centerLat,
        centerLon: a.centerLon,
        radiusKm: a.radiusKm,
      })),
    });
    const seeded = generateSeededObservations({
      destinationId: destination.id,
      destinationSlug: destination.slug,
      bounds,
    });
    for (const row of seeded) {
      await connectivityRepository.insertObservation({
        destinationId: row.destinationId,
        microAreaId: row.microAreaId ?? null,
        cellKey: row.cellKey,
        lat: row.lat,
        lon: row.lon,
        downloadMbps: row.downloadMbps,
        uploadMbps: row.uploadMbps,
        latencyMs: row.latencyMs,
        observedAt: new Date(row.observedAt),
        sourceName: row.sourceName,
        sourceVersion: row.sourceVersion ?? null,
      });
    }
    observations = await connectivityRepository.listObservationsForDestination(destination.id);
  }

  const computedRaw = computeConnectivityCells(
    observations.map((o) => ({
      destinationId: o.destinationId,
      microAreaId: o.microAreaId,
      cellKey: o.cellKey,
      lat: o.lat,
      lon: o.lon,
      downloadMbps: o.downloadMbps,
      uploadMbps: o.uploadMbps,
      latencyMs: o.latencyMs,
      observedAt: o.observedAt.toISOString(),
      sourceName: o.sourceName,
      sourceVersion: o.sourceVersion,
    })),
  );
  const computed = computedRaw.filter((cell) =>
    isInsideAnyMicroArea(cell.centroid.lat, cell.centroid.lon, areas) &&
    isNearAnyPlaceAnchor(
      cell.centroid.lat,
      cell.centroid.lon,
      placeAnchors,
      INTERNET_CELL_ANCHOR_MAX_KM,
    ),
  );

  const savedCells = [];
  for (const cell of computed) {
    const saved = await connectivityRepository.upsertCell({
      destinationId: destination.id,
      microAreaId: null,
      cellKey: cell.cellKey,
      geojson: cell.geojson,
      centroidLat: cell.centroid.lat,
      centroidLon: cell.centroid.lon,
      medianDownloadMbps: cell.median_download_mbps,
      medianUploadMbps: cell.median_upload_mbps,
      medianLatencyMs: cell.median_latency_ms,
      sampleCount: cell.sample_count,
      freshnessDays: cell.freshness_days,
      confidenceScore: cell.confidence_score,
      confidenceBucket: cell.confidence_bucket,
      remoteWorkScore: cell.remote_work_score,
      remoteWorkBucket: cell.remote_work_bucket,
      sourceName: cell.source_name,
      sourceVersion: cell.source_version,
      computedAt: new Date(cell.computed_at),
    });
    if (saved) savedCells.push(saved);
  }

  const bestCell = computed
    .slice()
    .sort((a, b) => b.remote_work_score - a.remote_work_score)[0];

  if (bestCell) {
    const fallback = deriveStarlinkFallbackByLatLon(
      bestCell.centroid.lat,
      bestCell.centroid.lon,
    );
    const bestSaved = savedCells.find((c) => c.cellKey === bestCell.cellKey);
    await connectivityRepository.upsertAreaProfile({
      destinationId: destination.id,
      areaId: "city",
      bestCellId: bestSaved?.id ?? null,
      summary: toSummary(bestCell),
      starlinkFallback: fallback,
      computedAt: new Date(),
    });
  }

  for (const area of areas) {
    const nearest = computed
      .slice()
      .sort(
        (a, b) =>
          distanceSq(a.centroid.lat, a.centroid.lon, area.centerLat, area.centerLon) -
          distanceSq(b.centroid.lat, b.centroid.lon, area.centerLat, area.centerLon),
      )[0];
    if (!nearest) continue;
    const nearestSaved = savedCells.find((c) => c.cellKey === nearest.cellKey);
    await connectivityRepository.upsertAreaProfile({
      destinationId: destination.id,
      areaId: area.id,
      bestCellId: nearestSaved?.id ?? null,
      summary: toSummary(nearest),
      starlinkFallback: deriveStarlinkFallbackByLatLon(area.centerLat, area.centerLon),
      computedAt: new Date(),
    });
  }

  return { ok: true, cellCount: savedCells.length };
}
