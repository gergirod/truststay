import type { PlaceCategory, BestForTag } from "@/types";

export function formatCategory(cat: PlaceCategory): string {
  switch (cat) {
    case "cafe":
      return "Café";
    case "coworking":
      return "Coworking";
    case "gym":
      return "Gym";
    case "food":
      return "Food";
  }
}

export function formatWorkFit(v: "low" | "medium" | "high"): string {
  return { low: "Low", medium: "Medium", high: "High" }[v];
}

export function formatWifi(
  v: "weak" | "medium" | "verified" | "unknown"
): string {
  return {
    weak: "Weak signal likely",
    medium: "Likely available",
    verified: "Verified",
    unknown: "Not verified",
  }[v];
}

export function formatNoiseRisk(
  v: "low" | "medium" | "high" | "unknown"
): string {
  return {
    low: "Low risk",
    medium: "May vary",
    high: "High risk",
    unknown: "Unknown",
  }[v];
}

export function formatLaptopFriendly(
  v: "yes" | "likely" | "mixed" | "unknown"
): string {
  return {
    yes: "Yes",
    likely: "Likely",
    mixed: "Mixed reports",
    unknown: "Unknown",
  }[v];
}

export function formatRoutineFit(v: "low" | "medium" | "high"): string {
  return { low: "Low", medium: "Decent", high: "Good" }[v];
}

export function formatConvenience(v: "low" | "medium" | "high"): string {
  return { low: "Low", medium: "Medium", high: "High" }[v];
}

export function formatBestForTag(tag: BestForTag): string {
  const map: Record<BestForTag, string> = {
    quick_stop: "Quick stop",
    backup_work: "Backup work",
    deep_work: "Deep work",
    calls: "Calls",
    short_session: "Short session",
    coffee_break: "Coffee break",
    training: "Training",
    quick_meal: "Quick meal",
    routine_support: "Routine support",
  };
  return map[tag];
}

export function formatDistance(km: number): string {
  if (km < 0.1) return "< 100 m";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
