import type { Place, CitySummary } from "@/types";
import { haversineKm } from "./overpass";

/**
 * Compute the centroid of all cafes and coworkings in the place list.
 * This is used as the "suggested base area" reference point for distance
 * calculations — more actionable than the raw geocoded city centre because
 * it reflects where work infrastructure actually clusters.
 *
 * Returns null if fewer than 3 work places exist (caller falls back to
 * city centre or omits the distance field).
 */
/** Max distance from the weighted centroid for a place to count in pass 2. */
const CENTROID_OUTLIER_KM = 2.5;

/**
 * Work-potential weight for centroid calculation.
 *
 * The base area should be wherever the best remote-work options are,
 * not just wherever most places cluster. This weight reflects that:
 *
 *   category base:
 *     coworking        → 10  (strongest signal for remote workers)
 *     work-fit cafe    → 5   (cafe with clear work signals)
 *     enriched cafe    → 3   (has Google data, usable but unclear work fit)
 *     OSM-only cafe    → 1   (minimal signal)
 *
 *   workFit bonus:     high +4 / medium +2 / low 0
 *   wifi bonus:        verified +3 / medium +1
 *   rating multiplier: scales the full score by 1.0–2.0 based on Google rating
 *                      no rating → neutral 1.0
 */
function centroidWeight(p: Place): number {
  // Base by category + work signals
  let base: number;
  if (p.category === "coworking") {
    base = 10;
  } else if (p.confidence.workFit === "high") {
    base = 5;
  } else if (p.google) {
    base = 3;
  } else {
    base = 1;
  }

  // workFit bonus
  const workFitBonus =
    p.confidence.workFit === "high" ? 4 :
    p.confidence.workFit === "medium" ? 2 : 0;

  // wifi bonus
  const wifiBonus =
    p.confidence.wifiConfidence === "verified" ? 3 :
    p.confidence.wifiConfidence === "medium" ? 1 : 0;

  // rating multiplier (1.0 if no rating, up to 2.0 for ★5)
  const rating = p.google?.rating ?? p.rating;
  const ratingMult = rating ? Math.min(Math.max(rating / 5 * 2, 1.0), 2.0) : 1.0;

  return (base + workFitBonus + wifiBonus) * ratingMult;
}

export function computeBaseCentroid(
  places: Place[]
): { lat: number; lon: number } | null {
  const workPlaces = places.filter(
    (p) => p.category === "cafe" || p.category === "coworking"
  );
  if (workPlaces.length < 3) return null;

  // Pass 1: weighted centroid — coworkings + enriched cafes pull harder
  const totalWeight1 = workPlaces.reduce((s, p) => s + centroidWeight(p), 0);
  const roughLat = workPlaces.reduce((s, p) => s + p.lat * centroidWeight(p), 0) / totalWeight1;
  const roughLon = workPlaces.reduce((s, p) => s + p.lon * centroidWeight(p), 0) / totalWeight1;

  // Pass 2: drop outliers > CENTROID_OUTLIER_KM from the weighted centroid
  const cluster = workPlaces.filter(
    (p) => haversineKm(roughLat, roughLon, p.lat, p.lon) <= CENTROID_OUTLIER_KM
  );
  const finalPlaces = cluster.length >= 2 ? cluster : workPlaces;

  // Final weighted average using only the cluster
  const totalWeight2 = finalPlaces.reduce((s, p) => s + centroidWeight(p), 0);
  const lat = finalPlaces.reduce((s, p) => s + p.lat * centroidWeight(p), 0) / totalWeight2;
  const lon = finalPlaces.reduce((s, p) => s + p.lon * centroidWeight(p), 0) / totalWeight2;
  return { lat, lon };
}

// Per .cursor/rules/01-recommended-area-logic.mdc:
// centroid requires at least this many total places across all categories.
const MIN_PLACES_FOR_CENTROID = 5;

// Each sub-score is capped below 1.0 to avoid implying certainty.
// Even with abundant data we can only say "likely good", not "perfect".
const SCORE_CERTAINTY_CAP = 0.85;

// Thresholds are intentionally high — a well-served city should reach ~70-82,
// not 100. Hitting the cap requires genuine density, not just a few spots.
const THRESHOLDS = {
  cafe: 15,
  coworking: 4,
  gym: 4,
  food: 15,
};

function cappedRatio(count: number, threshold: number): number {
  return Math.min(count / threshold, SCORE_CERTAINTY_CAP);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function computeCitySummary(
  city: { name: string; lat: number; lon: number },
  places: Place[],
  areaName?: string
): CitySummary {
  const cafes = places.filter((p) => p.category === "cafe");
  const coworkings = places.filter((p) => p.category === "coworking");
  const gyms = places.filter((p) => p.category === "gym");
  const food = places.filter((p) => p.category === "food");

  // Each category contributes up to 25 × SCORE_CERTAINTY_CAP ≈ 21 points.
  // Total max ≈ 85. A score of 100 is intentionally unreachable.
  const cafeScore = cappedRatio(cafes.length, THRESHOLDS.cafe) * 25;
  const coworkScore = cappedRatio(coworkings.length, THRESHOLDS.coworking) * 25;
  const gymScore = cappedRatio(gyms.length, THRESHOLDS.gym) * 25;
  const foodScore = cappedRatio(food.length, THRESHOLDS.food) * 25;
  const routineScore = Math.round(cafeScore + coworkScore + gymScore + foodScore);

  // Build dynamic summary from actual category counts instead of static strings.
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (cafes.length >= 5) strengths.push("good café density");
  else if (cafes.length >= 2) strengths.push("some café options");
  else gaps.push("few cafés");

  if (coworkings.length >= 2) strengths.push("coworking options available");
  else if (coworkings.length === 1) strengths.push("a coworking nearby");
  else gaps.push("no coworkings found");

  if (gyms.length >= 2) strengths.push("gym access nearby");
  else if (gyms.length === 1) strengths.push("a gym option nearby");
  else gaps.push("limited gym options");

  if (food.length >= 5) strengths.push("multiple food options");
  else if (food.length >= 2) strengths.push("some food spots");
  else gaps.push("few food spots");

  let summaryText: string;
  if (strengths.length >= 3 && gaps.length === 0) {
    const s = strengths.slice(0, 3);
    summaryText = `${capitalize(s[0])}, ${s[1]}, and ${s[2]}. Well-supported for a remote-work routine.`;
  } else if (strengths.length >= 2 && gaps.length <= 1) {
    const s = strengths.slice(0, 2);
    const g = gaps[0];
    summaryText = g
      ? `${capitalize(s[0])} and ${s[1]}. ${capitalize(g)} in this area.`
      : `${capitalize(s[0])} and ${s[1]}. Decent setup for a remote-work stay.`;
  } else if (strengths.length >= 1) {
    const g = gaps.slice(0, 2).join(", ");
    summaryText = `${capitalize(strengths[0])}. ${capitalize(g)} — worth factoring into your setup.`;
  } else {
    summaryText =
      "Very limited data for this area. Hard to assess routine support — explore from the center.";
  }

  const confidence: CitySummary["confidence"] =
    routineScore >= 60 ? "high" : routineScore >= 35 ? "medium" : "low";

  // Recommended area logic per cursor rule 01:
  // sparse data → generic label with low-confidence disclaimer
  if (places.length < MIN_PLACES_FOR_CENTROID) {
    return {
      routineScore,
      summaryText,
      recommendedArea: "Central area",
      confidence: "low",
      areaReason:
        "Limited place data. This is a general suggestion — explore from the center.",
    };
  }

  // Use the reverse-geocoded neighbourhood name when available; fall back to
  // "Central {city}" which is still more readable than raw coordinates.
  const recommendedArea =
    areaName && areaName.trim().length > 0
      ? areaName
      : `Central ${city.name}`;

  // Generate a reason sentence based on what actually clusters near this zone.
  let areaReason: string;
  if (coworkings.length >= 2 && cafes.length >= 5) {
    areaReason =
      "Coworkings and several work-friendly cafés are within walking distance of this zone.";
  } else if (coworkings.length >= 1 && cafes.length >= 3) {
    areaReason =
      "A coworking and work-friendly cafés cluster near this area.";
  } else if (cafes.length >= 8) {
    areaReason =
      "Most work-friendly cafés cluster within this zone — a practical base for café workers.";
  } else if (cafes.length >= 3) {
    areaReason =
      "Work spots and cafés seem to concentrate around this area.";
  } else {
    areaReason =
      "Based on available data — coverage for this city is limited.";
  }

  return { routineScore, summaryText, recommendedArea, confidence, areaReason };
}
