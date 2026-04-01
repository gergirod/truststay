import type { StarlinkFallback } from "@/lib/connectivity/types";

export function deriveStarlinkFallbackByLatLon(
  lat: number,
  lon: number,
): StarlinkFallback {
  void lon;
  const absLat = Math.abs(lat);
  if (absLat < 50) {
    return {
      status: "available",
      source_confidence: "derived",
      notes: ["Estimated from latitude-based coverage heuristic."],
      display_label: "Starlink fallback available",
    };
  }
  if (absLat < 56) {
    return {
      status: "capacity_constrained",
      source_confidence: "derived",
      notes: ["Coverage likely available with possible regional capacity constraints."],
      display_label: "Starlink capacity constrained",
    };
  }
  return {
    status: "unknown",
    source_confidence: "unknown",
    notes: ["No reliable fallback signal for this coordinate yet."],
    display_label: "Starlink status unknown",
  };
}
