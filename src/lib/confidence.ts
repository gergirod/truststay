import type { PlaceCategory, PlaceConfidence, BestForTag } from "@/types";

export interface ConfidenceResult {
  confidence: PlaceConfidence;
  bestFor: BestForTag[];
  explanation: string;
}

export function deriveConfidence(
  tags: Record<string, string>,
  category: PlaceCategory,
  distanceKm: number
): ConfidenceResult {
  const hasInternet =
    tags.internet_access === "wlan" ||
    tags.internet_access === "yes" ||
    tags.wifi === "yes";
  const hasOutdoorSeating = tags.outdoor_seating === "yes";
  const nameHint = (tags.name ?? "").toLowerCase();
  const isWorkNamed = /cowork|workspace|hackerspace/.test(nameHint);

  if (category === "coworking") {
    return {
      confidence: {
        workFit: "high",
        noiseRisk: "low",
        wifiConfidence: hasInternet ? "verified" : "medium",
        laptopFriendly: "yes",
      },
      bestFor: ["backup_work", "deep_work"],
      explanation:
        "Dedicated coworking venue — strong work signals based on venue type and proximity.",
    };
  }

  if (category === "cafe") {
    const workFit = isWorkNamed ? "high" : "medium";
    const wifiConfidence = hasInternet ? "medium" : "unknown";
    const noiseRisk: PlaceConfidence["noiseRisk"] = hasOutdoorSeating
      ? "medium"
      : "unknown";
    const laptopFriendly: PlaceConfidence["laptopFriendly"] = isWorkNamed
      ? "likely"
      : "unknown";

    const bestFor: BestForTag[] = ["coffee_break", "quick_stop"];
    if (workFit === "high") {
      bestFor.push("deep_work");
    } else {
      bestFor.push("short_session", "backup_work");
    }

    const parts: string[] = [];
    if (isWorkNamed) {
      parts.push("Work-oriented café based on name and category");
    } else {
      parts.push("Café with moderate work signals");
    }
    if (wifiConfidence === "unknown") parts.push("internet not verified");
    if (noiseRisk === "medium")
      parts.push("noise may vary due to outdoor seating");

    return {
      confidence: { workFit, wifiConfidence, noiseRisk, laptopFriendly },
      bestFor,
      explanation: parts.join(", ") + ".",
    };
  }

  if (category === "gym") {
    const convenience: PlaceConfidence["convenience"] =
      distanceKm < 0.5 ? "high" : distanceKm < 1.5 ? "medium" : "low";
    const routineFit: PlaceConfidence["routineFit"] =
      convenience === "high"
        ? "high"
        : convenience === "medium"
        ? "medium"
        : "low";

    const bestFor: BestForTag[] = ["training"];
    if (routineFit !== "low") bestFor.push("routine_support");

    const explanation =
      distanceKm < 0.5
        ? "Gym within easy walking distance — good for a steady training routine."
        : distanceKm < 1.5
        ? "Gym within a short trip — convenient for regular training sessions."
        : "Gym available but may require a longer commute from the suggested area.";

    return { confidence: { routineFit, convenience }, bestFor, explanation };
  }

  // food
  const isQuickService =
    tags.amenity === "fast_food" || tags.amenity === "food_court";
  const convenience: PlaceConfidence["convenience"] =
    distanceKm < 0.5 ? "high" : distanceKm < 1.5 ? "medium" : "low";
  const quickMealFit: PlaceConfidence["quickMealFit"] = isQuickService
    ? "high"
    : "medium";
  const routineSupport: PlaceConfidence["routineSupport"] =
    convenience === "high" ? "high" : "medium";

  return {
    confidence: { convenience, quickMealFit, routineSupport },
    bestFor: isQuickService
      ? ["quick_meal", "quick_stop"]
      : ["quick_meal", "routine_support"],
    explanation: isQuickService
      ? "Quick-service option near the recommended area — good for time-efficient meals."
      : "Restaurant nearby — useful for routine meal support without searching far.",
  };
}
