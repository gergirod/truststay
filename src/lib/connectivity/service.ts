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
  if (process.env.CONNECTIVITY_ALLOW_SEEDED === "true") return true;
  if (process.env.CONNECTIVITY_ALLOW_SEEDED === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function generateSeededObservations(params: {
  destinationId: string;
  destinationSlug: string;
  centerLat: number;
  centerLon: number;
}): NormalizedConnectivityObservation[] {
  const { destinationId, destinationSlug, centerLat, centerLon } = params;
  const seed = hashNumber(destinationSlug);
  const rows: NormalizedConnectivityObservation[] = [];
  const latStep = 0.0095;
  const lonStep = 0.0095 / Math.max(0.35, Math.cos((centerLat * Math.PI) / 180));

  let idx = 0;
  for (const y of [-1, 0, 1]) {
    for (const x of [-1, 0, 1]) {
      const cellKey = `${destinationSlug}:c${idx}`;
      const base = 72 - Math.abs(x) * 12 - Math.abs(y) * 8 + (seed % 7);
      for (let s = 0; s < 8; s += 1) {
        const jitter = ((seed + idx * 17 + s * 13) % 9) - 4;
        const quality = Math.max(28, Math.min(94, base + jitter));
        const observedAt = new Date(
          Date.now() - ((seed + s * 3 + idx) % 21) * 24 * 60 * 60 * 1000,
        ).toISOString();
        rows.push({
          destinationId,
          cellKey,
          lat: centerLat + y * latStep + (jitter * 0.00015),
          lon: centerLon + x * lonStep + (jitter * 0.00013),
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

export async function ensureConnectivityPrecomputedForCitySlug(
  citySlug: string,
): Promise<{ ok: boolean; cellCount: number }> {
  const destination = await canonicalRepository.getDestinationBySlug(citySlug);
  if (!destination) return { ok: false, cellCount: 0 };

  const existingCount = await connectivityRepository.countCellsForDestination(destination.id);
  if (existingCount > 0) return { ok: true, cellCount: existingCount };

  let observations = await connectivityRepository.listObservationsForDestination(destination.id);
  if (!observations.length) {
    if (!allowSeededConnectivityData()) {
      return { ok: true, cellCount: 0 };
    }
    const centerLat = destination.anchorLat ?? 0;
    const centerLon = destination.anchorLon ?? 0;
    const seeded = generateSeededObservations({
      destinationId: destination.id,
      destinationSlug: destination.slug,
      centerLat,
      centerLon,
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

  const computed = computeConnectivityCells(
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

  const areas = await canonicalRepository.listMicroAreasForDestination(destination.id);
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
