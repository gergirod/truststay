import type { Place, CitySummary } from "@/types";

// Per .cursor/rules/01-recommended-area-logic.mdc:
// centroid requires at least this many total places across all categories.
const MIN_PLACES_FOR_CENTROID = 5;

function computeCentroid(
  places: Place[]
): { lat: number; lon: number } | null {
  if (!places.length) return null;
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
  const lon = places.reduce((s, p) => s + p.lon, 0) / places.length;
  return { lat, lon };
}

// Returns a compass direction string when the centroid meaningfully deviates
// from the city center. Used to build a descriptive area label.
function compassLabel(dLat: number, dLon: number): string {
  const aLat = Math.abs(dLat);
  const aLon = Math.abs(dLon);

  // ~300m threshold — below this call it simply "central"
  if (aLat < 0.003 && aLon < 0.003) return "";

  const ns = dLat > 0 ? "north" : "south";
  const ew = dLon > 0 ? "east" : "west";

  if (aLat > aLon * 2) return ns;
  if (aLon > aLat * 2) return ew;
  return `${ns}${ew}`;
}

export function computeCitySummary(
  city: { name: string; lat: number; lon: number },
  places: Place[]
): CitySummary {
  const cafes = places.filter((p) => p.category === "cafe");
  const coworkings = places.filter((p) => p.category === "coworking");
  const gyms = places.filter((p) => p.category === "gym");
  const food = places.filter((p) => p.category === "food");

  // Each category contributes up to 25 points
  const cafeScore = Math.min(cafes.length / 8, 1) * 25;
  const coworkScore = Math.min(coworkings.length / 2, 1) * 25;
  const gymScore = Math.min(gyms.length / 2, 1) * 25;
  const foodScore = Math.min(food.length / 8, 1) * 25;
  const routineScore = Math.round(cafeScore + coworkScore + gymScore + foodScore);

  const summaryText =
    routineScore >= 75
      ? "Good setup for a remote-work routine. Work, training, and food options are well represented."
      : routineScore >= 50
      ? "Decent city for a remote-work stay. Some gaps, but core needs are covered."
      : routineScore >= 25
      ? "Limited remote-work infrastructure based on available data. Plan your setup carefully."
      : "Very few places found. Data may be incomplete or sparse for this city.";

  const confidence: CitySummary["confidence"] =
    routineScore >= 60 ? "high" : routineScore >= 35 ? "medium" : "low";

  // Recommended area logic per cursor rule 01:
  // sparse data → generic label with low-confidence disclaimer
  if (places.length < MIN_PLACES_FOR_CENTROID) {
    return {
      routineScore,
      summaryText,
      recommendedArea: "Central area recommended",
      confidence: "low",
    };
  }

  const centroid = computeCentroid(places)!;
  const dir = compassLabel(centroid.lat - city.lat, centroid.lon - city.lon);
  const areaName = dir
    ? `${dir.charAt(0).toUpperCase() + dir.slice(1)}-central ${city.name}`
    : `Central ${city.name}`;

  return { routineScore, summaryText, recommendedArea: areaName, confidence };
}
