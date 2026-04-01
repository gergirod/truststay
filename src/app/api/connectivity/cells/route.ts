import { NextRequest, NextResponse } from "next/server";
import { connectivityRepository } from "@/db/repositories";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";

function parseBbox(raw: string | null) {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts;
  return { minLat, minLon, maxLat, maxLon };
}

export async function GET(req: NextRequest) {
  const citySlug = req.nextUrl.searchParams.get("citySlug")?.trim();
  if (!citySlug) {
    return NextResponse.json({ error: "citySlug is required" }, { status: 400 });
  }

  await ensureConnectivityPrecomputedForCitySlug(citySlug);
  const destination = await connectivityRepository.getDestinationBySlug(citySlug);
  if (!destination) {
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }

  const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));
  const rows = await connectivityRepository.listCellsForDestination(destination.id, bbox ?? undefined);

  return NextResponse.json({
    type: "FeatureCollection",
    features: rows.map((row) => ({
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
