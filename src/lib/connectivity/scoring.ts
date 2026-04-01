import type {
  ConnectivityBucket,
  ConnectivityCellComputed,
  ConnectivityConfidence,
  ConnectivitySummary,
  NormalizedConnectivityObservation,
} from "@/lib/connectivity/types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
  return values.reduce((sum, n) => sum + (n - mean) ** 2, 0) / values.length;
}

function bucketForScore(score: number): ConnectivityBucket {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "okay";
  return "risky";
}

function confidenceBucket(score: number): ConnectivityConfidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function recommendationShort(bucket: ConnectivityBucket): string {
  if (bucket === "excellent") return "Strong for calls, deep work, and uploads.";
  if (bucket === "good") return "Good for day-to-day remote work.";
  if (bucket === "okay") return "Fine for lighter work, but calls may be less stable.";
  return "Can be unreliable for work that depends on stable internet.";
}

function recommendationLong(
  bucket: ConnectivityBucket,
  confidence: ConnectivityConfidence,
): string {
  const base =
    bucket === "excellent"
      ? "Internet here looks strong for daily remote work, including calls and bigger file transfers."
      : bucket === "good"
      ? "Internet here should work well for most routines, with occasional slower periods."
      : bucket === "okay"
      ? "Internet here is workable for lighter async days, but can be inconsistent for frequent calls."
      : "Internet here looks inconsistent, so confirm actual speed with your accommodation before booking.";
  if (confidence === "high") return base;
  if (confidence === "medium") return `${base} We have a moderate amount of data, so it's best to double-check before longer stays.`;
  return `${base} We have limited data for this area, so treat this as an early estimate.`;
}

export function buildConnectivitySummary(input: {
  score: number;
  bucket: ConnectivityBucket;
  median_download_mbps: number | null;
  median_upload_mbps: number | null;
  median_latency_ms: number | null;
  confidence: ConnectivityConfidence;
  freshness_days: number | null;
}): ConnectivitySummary {
  const warnings: string[] = [];
  if (input.confidence !== "high") warnings.push("This is an estimate, not a guarantee.");
  if (typeof input.freshness_days === "number" && input.freshness_days > 30) {
    warnings.push("Some of the internet data is older than usual.");
  }
  if (
    typeof input.median_latency_ms === "number" &&
    input.median_latency_ms > 95
  ) {
    warnings.push("Call quality may drop during busy hours.");
  }

  return {
    ...input,
    summary_short: recommendationShort(input.bucket),
    summary_long: recommendationLong(input.bucket, input.confidence),
    warnings,
  };
}

export function computeConnectivityCells(
  observations: NormalizedConnectivityObservation[],
  now = new Date(),
): ConnectivityCellComputed[] {
  const byCell = new Map<string, NormalizedConnectivityObservation[]>();
  for (const obs of observations) {
    const bucket = byCell.get(obs.cellKey) ?? [];
    bucket.push(obs);
    byCell.set(obs.cellKey, bucket);
  }

  return [...byCell.entries()].map(([cellKey, rows]) => {
    const downloads = rows
      .map((r) => r.downloadMbps)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    const uploads = rows
      .map((r) => r.uploadMbps)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    const latencies = rows
      .map((r) => r.latencyMs)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

    const medianDownload = median(downloads);
    const medianUpload = median(uploads);
    const medianLatency = median(latencies);
    const sampleCount = rows.length;

    const newestObservedMs = rows
      .map((r) => new Date(r.observedAt).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => b - a)[0];
    const freshnessDays = Number.isFinite(newestObservedMs)
      ? Math.max(0, Math.floor((now.getTime() - newestObservedMs) / (24 * 60 * 60 * 1000)))
      : null;

    const centroidLat = rows.reduce((sum, r) => sum + r.lat, 0) / rows.length;
    const centroidLon = rows.reduce((sum, r) => sum + r.lon, 0) / rows.length;
    const latHalf = 0.005;
    const lonHalf = 0.005 / Math.max(0.35, Math.cos((centroidLat * Math.PI) / 180));

    const downloadScore = medianDownload == null ? 0 : clamp((medianDownload / 120) * 100, 0, 100);
    const uploadScore = medianUpload == null ? 0 : clamp((medianUpload / 35) * 100, 0, 100);
    const latencyScore =
      medianLatency == null ? 0 : clamp(((180 - medianLatency) / 160) * 100, 0, 100);

    const sampleFactor = clamp(Math.log10(sampleCount + 1) / 1.2, 0, 1);
    const freshnessFactor =
      freshnessDays == null
        ? 0.35
        : freshnessDays <= 3
        ? 1
        : freshnessDays <= 14
        ? 0.78
        : freshnessDays <= 30
        ? 0.58
        : 0.35;
    const variancePenalty = clamp(
      (variance(downloads) / (Math.max(medianDownload ?? 1, 1) ** 2)) * 100,
      0,
      65,
    );
    const confidenceScore = clamp(
      Math.round(sampleFactor * 55 + freshnessFactor * 35 - variancePenalty * 0.25),
      0,
      100,
    );

    const blendedConfidenceFreshness = (confidenceScore + freshnessFactor * 100) / 2;
    const remoteWorkScore = clamp(
      Math.round(
        downloadScore * 0.4 +
          uploadScore * 0.2 +
          latencyScore * 0.25 +
          blendedConfidenceFreshness * 0.15,
      ),
      0,
      100,
    );
    const remoteWorkBucket = bucketForScore(remoteWorkScore);

    return {
      cellKey,
      centroid: { lat: centroidLat, lon: centroidLon },
      geojson: {
        type: "Polygon",
        coordinates: [[
          [centroidLon - lonHalf, centroidLat - latHalf],
          [centroidLon + lonHalf, centroidLat - latHalf],
          [centroidLon + lonHalf, centroidLat + latHalf],
          [centroidLon - lonHalf, centroidLat + latHalf],
          [centroidLon - lonHalf, centroidLat - latHalf],
        ]],
      },
      median_download_mbps: medianDownload == null ? null : Math.round(medianDownload * 10) / 10,
      median_upload_mbps: medianUpload == null ? null : Math.round(medianUpload * 10) / 10,
      median_latency_ms: medianLatency == null ? null : Math.round(medianLatency),
      sample_count: sampleCount,
      freshness_days: freshnessDays,
      confidence_score: confidenceScore,
      confidence_bucket: confidenceBucket(confidenceScore),
      remote_work_score: remoteWorkScore,
      remote_work_bucket: remoteWorkBucket,
      source_name: rows[0]?.sourceName ?? "unknown",
      source_version: rows[0]?.sourceVersion ?? null,
      computed_at: now.toISOString(),
    };
  });
}
