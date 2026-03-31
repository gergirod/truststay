import type { PlaceCategory, BestForTag, GooglePlaceData } from "@/types";

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
    case "essential":
      return "Essential";
  }
}

export function formatWorkFit(v: "low" | "medium" | "high"): string {
  return {
    low: "Likely limited",
    medium: "Possibly workable",
    high: "Likely a good fit",
  }[v];
}

export function formatWifi(
  v: "weak" | "medium" | "verified" | "unknown"
): string {
  return {
    weak: "Weak signal likely",
    medium: "Probably available",
    verified: "Verified",
    unknown: "Not verified",
  }[v];
}

export function formatNoiseRisk(
  v: "low" | "medium" | "high" | "unknown"
): string {
  return {
    low: "Likely quiet",
    medium: "May vary",
    high: "Likely noisy",
    unknown: "Not assessed",
  }[v];
}

export function formatRoutineFit(v: "low" | "medium" | "high"): string {
  return {
    low: "Less convenient",
    medium: "Reasonably close",
    high: "Very convenient",
  }[v];
}

export function formatConvenience(v: "low" | "medium" | "high"): string {
  return {
    low: "Further away",
    medium: "Moderate distance",
    high: "Close by",
  }[v];
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

export function formatQuickMealFit(v: "low" | "medium" | "high"): string {
  return {
    low: "Slow service likely",
    medium: "Possible quick meal",
    high: "Good for quick meal",
  }[v];
}

export function formatRoutineSupport(v: "low" | "medium" | "high"): string {
  return {
    low: "Less routine-friendly",
    medium: "Likely useful near base",
    high: "Good routine fit",
  }[v];
}

export function formatPriceLevel(
  level: NonNullable<GooglePlaceData["priceLevel"]>
): string {
  return {
    free: "Free",
    inexpensive: "$",
    moderate: "$$",
    expensive: "$$$",
    very_expensive: "$$$$",
  }[level];
}
