import type { Place, CitySummary } from "@/types";

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

export function computeCitySummary(
  city: { name: string; lat: number; lon: number },
  places: Place[]
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

  const summaryText =
    routineScore >= 70
      ? "Well-supported for a remote-work routine. Work, training, and food options are well represented."
      : routineScore >= 50
      ? "Decent setup for a remote-work stay. Core needs appear covered, with some gaps."
      : routineScore >= 25
      ? "Some gaps in remote-work infrastructure. Worth planning your setup before you arrive."
      : "Limited places found in this area. Data may be sparse, or amenities may be further out.";

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
    };
  }

  // Area label is always "Central [city name]" — we compute a centroid
  // internally but do not surface compass coordinates as a label.
  // Compass directions add false precision and read as robotic to users.
  const recommendedArea = `Central ${city.name}`;

  return { routineScore, summaryText, recommendedArea, confidence };
}
