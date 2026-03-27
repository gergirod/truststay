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
      explanation: hasInternet
        ? "Coworking space with internet access noted — generally a more reliable option for focused work than a café."
        : "Coworking space — generally a more reliable option for focused work. Internet likely available but not verified from this source.",
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
      // Work-named cafes — strong positive signal
      bestFor.push("deep_work", "backup_work");
    } else if (hasInternet) {
      // Explicit wifi tag in OSM — reasonable work backup
      bestFor.push("backup_work", "short_session");
    }
    // Generic cafes with no signals → only coffee_break / quick_stop
    // This prevents routing ambiguous espresso bars into the Work section

    // Natural sentence explanations rather than comma-joined fragments
    let explanation: string;
    if (isWorkNamed) {
      explanation =
        wifiConfidence === "unknown"
          ? "Work-oriented café based on the name — laptop-friendly signals, though internet isn't verified from this source."
          : "Work-oriented café with internet access noted — better work signals than a typical café.";
    } else if (hasOutdoorSeating && wifiConfidence === "unknown") {
      explanation =
        "Café with outdoor seating — could work for a break or short session, though noise may vary and internet isn't verified.";
    } else if (wifiConfidence === "unknown") {
      explanation =
        "Café — likely decent for a short session or coffee break, though internet isn't verified from this source.";
    } else {
      explanation =
        "Café with internet access noted — a reasonable short-session option.";
    }

    return {
      confidence: { workFit, wifiConfidence, noiseRisk, laptopFriendly },
      bestFor,
      explanation,
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
        ? "Close enough to walk — easy to build into a daily routine."
        : distanceKm < 1.5
        ? "A short trip away — still manageable for regular training sessions."
        : "Further out from the suggested area — worth factoring in if routine training matters to you.";

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
      ? "Quick-service spot nearby — useful when you need a fast meal without going far."
      : "Restaurant within range — a reasonable option for keeping a regular meal routine.",
  };
}
