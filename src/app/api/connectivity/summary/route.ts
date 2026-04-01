import { NextRequest, NextResponse } from "next/server";
import { connectivityRepository } from "@/db/repositories";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";
import { buildConnectivitySummary } from "@/lib/connectivity/scoring";

function distanceSq(aLat: number, aLon: number, bLat: number, bLon: number): number {
  return (aLat - bLat) ** 2 + (aLon - bLon) ** 2;
}

export async function GET(req: NextRequest) {
  const citySlug = req.nextUrl.searchParams.get("citySlug")?.trim();
  const force = req.nextUrl.searchParams.get("force") === "1";
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lng") ?? req.nextUrl.searchParams.get("lon"));
  if (!citySlug || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "citySlug, lat, and lng are required" },
      { status: 400 },
    );
  }

  await ensureConnectivityPrecomputedForCitySlug(citySlug, {
    forceRecompute: force,
  });
  const destination = await connectivityRepository.getDestinationBySlug(citySlug);
  if (!destination) return NextResponse.json({ summary: null });

  const cells = await connectivityRepository.listCellsForDestination(destination.id);
  const nearest = cells
    .slice()
    .sort(
      (a, b) =>
        distanceSq(a.centroidLat, a.centroidLon, lat, lon) -
        distanceSq(b.centroidLat, b.centroidLon, lat, lon),
    )[0];
  if (!nearest) return NextResponse.json({ summary: null });

  const summary = buildConnectivitySummary({
    score: nearest.remoteWorkScore,
    bucket: nearest.remoteWorkBucket,
    median_download_mbps: nearest.medianDownloadMbps,
    median_upload_mbps: nearest.medianUploadMbps,
    median_latency_ms: nearest.medianLatencyMs,
    confidence: nearest.confidenceBucket,
    freshness_days: nearest.freshnessDays,
  });

  return NextResponse.json({
    summary,
    source: {
      name: nearest.sourceName,
      version: nearest.sourceVersion,
      computed_at: nearest.computedAt?.toISOString?.() ?? null,
    },
  });
}
