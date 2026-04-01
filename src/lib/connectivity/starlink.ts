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
      notes: ["Estimated from regional Starlink coverage patterns."],
      display_label: "Satellite backup likely available",
    };
  }
  if (absLat < 56) {
    return {
      status: "capacity_constrained",
      source_confidence: "derived",
      notes: ["Coverage may exist, but signups or performance can be constrained in this region."],
      display_label: "Satellite backup may be limited",
    };
  }
  return {
    status: "unknown",
    source_confidence: "unknown",
    notes: ["Not enough reliable signal yet for this area."],
    display_label: "Satellite backup status unknown",
  };
}
