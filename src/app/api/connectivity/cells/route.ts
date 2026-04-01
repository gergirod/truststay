import { NextRequest, NextResponse } from "next/server";
import { canonicalRepository } from "@/db/repositories";
import { connectivityRepository } from "@/db/repositories";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";

function parseBbox(raw: string | null) {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return { minLat, minLon, maxLat, maxLon };
}

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

export async function GET(req: NextRequest) {
  const citySlug = req.nextUrl.searchParams.get("citySlug")?.trim();
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!citySlug) {
    return NextResponse.json({ error: "citySlug is required" }, { status: 400 });
  }

  await ensureConnectivityPrecomputedForCitySlug(citySlug, {
    forceRecompute: force,
  });
  const destination = await connectivityRepository.getDestinationBySlug(citySlug);
  if (!destination) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));
  const rows = await connectivityRepository.listCellsForDestination(destination.id, bbox ?? undefined);
  const areas = await canonicalRepository.listMicroAreasForDestination(destination.id);
  const placeAnchors = await canonicalRepository.listPlaceAnchorsForDestination(destination.id);
  const filteredRows = rows.filter((row) => {
    const insideArea =
      areas.length === 0 ||
      areas.some((a) =>
        haversineKm(row.centroidLat, row.centroidLon, a.centerLat, a.centerLon) <=
        Math.max(0.4, a.radiusKm * 1.15),
      );
    if (!insideArea) return false;
    if (placeAnchors.length === 0) return true;
    return placeAnchors.some(
      (p) => haversineKm(row.centroidLat, row.centroidLon, p.lat, p.lon) <= 2.8,
    );
  });

  return NextResponse.json({
    type: "FeatureCollection",
    features: filteredRows.map((row) => ({
      type: "Feature",
      geometry: row.geojson,
      properties: {
        id: row.id,
        cell_key: row.cellKey,
        score: row.remoteWorkScore,
        bucket: row.remoteWorkBucket,
        median_download_mbps: row.medianDownloadMbps,
        median_upload_mbps: row.medianUploadMbps,
        median_latency_ms: row.medianLatencyMs,
        sample_count: row.sampleCount,
        freshness_days: row.freshnessDays,
        confidence_score: row.confidenceScore,
        confidence: row.confidenceBucket,
        source_name: row.sourceName,
        source_version: row.sourceVersion,
        computed_at: row.computedAt?.toISOString?.() ?? null,
      },
    })),
  });
}
