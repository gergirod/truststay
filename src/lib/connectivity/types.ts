export type ConnectivityBucket = "excellent" | "good" | "okay" | "risky";
export type ConnectivityConfidence = "low" | "medium" | "high";

export type ConnectivitySummary = {
  score: number;
  bucket: ConnectivityBucket;
  median_download_mbps: number | null;
  median_upload_mbps: number | null;
  median_latency_ms: number | null;
  confidence: ConnectivityConfidence;
  freshness_days: number | null;
  summary_short: string;
  summary_long: string;
  warnings: string[];
};

export type StarlinkFallback = {
  status: "available" | "capacity_constrained" | "unknown" | "not_available";
  source_confidence: "official" | "derived" | "unknown";
  notes: string[];
  display_label: string;
};

export interface NormalizedConnectivityObservation {
  id?: string;
  destinationId: string;
  microAreaId?: string | null;
  cellKey: string;
  lat: number;
  lon: number;
  downloadMbps: number | null;
  uploadMbps: number | null;
  latencyMs: number | null;
  observedAt: string;
  sourceName: string;
  sourceVersion?: string | null;
}

export interface ConnectivityCellComputed {
  cellKey: string;
  centroid: { lat: number; lon: number };
  geojson: GeoJSON.Polygon;
  median_download_mbps: number | null;
  median_upload_mbps: number | null;
  median_latency_ms: number | null;
  sample_count: number;
  freshness_days: number | null;
  confidence_score: number;
  confidence_bucket: ConnectivityConfidence;
  remote_work_score: number;
  remote_work_bucket: ConnectivityBucket;
  source_name: string;
  source_version: string | null;
  computed_at: string;
}
