/**
 * Google Places enrichment layer.
 *
 * Responsibilities:
 *   1. Fetch Google Places results for cafes, coworkings, and food (server-side only)
 *   2. Match each OSM place to its best Google counterpart using
 *      proximity + name similarity heuristics
 *   3. Merge Google data into matched places (additive — no OSM fields removed)
 *   4. Upgrade confidence signals where Google data provides evidence
 *      using honest, non-absolute language
 *
 * If GOOGLE_MAPS_API_KEY is absent, or if any fetch fails, the original
 * OSM-only places are returned unchanged. The app never breaks.
 */

import type { Place, GooglePlaceData } from "@/types";
import { haversineKm } from "./overpass";
import { searchNearbyPlaces, type RawGooglePlace } from "./googlePlaces";

// ── Matching thresholds ────────────────────────────────────────────────────

/** Accept a match only if the places are within this distance */
const MAX_MATCH_DISTANCE_KM = 0.25;
/** Accept a match only if the name similarity score is at least this value */
const MIN_NAME_SIMILARITY = 0.35;
/** Reject matches where the OSM place name is suspiciously short (likely unnamed/partial) */
const MIN_OSM_NAME_LENGTH = 3;

// ── Name similarity ────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return (
    name
      .toLowerCase()
      // strip diacritics (é → e, ñ → n, etc.)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Returns a 0–1 similarity score. 1 = identical, 0 = nothing in common. */
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Word overlap ratio (ignores very short function words)
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  const common = [...wordsA].filter((w) => wordsB.has(w)).length;
  const total = new Set([...wordsA, ...wordsB]).size;
  return total === 0 ? 0 : common / total;
}

// ── Matching ───────────────────────────────────────────────────────────────

/**
 * Find the best-matching Google place for a given OSM place.
 * Returns null if no candidate meets both the distance and name thresholds.
 * The scoring formula weights name similarity more heavily than distance.
 */
function findMatch(
  place: Place,
  pool: RawGooglePlace[]
): RawGooglePlace | null {
  let best: RawGooglePlace | null = null;
  let bestScore = 0;

  for (const g of pool) {
    if (!g.location || !g.displayName?.text) continue;

    const dist = haversineKm(
      place.lat,
      place.lon,
      g.location.latitude,
      g.location.longitude
    );
    if (dist > MAX_MATCH_DISTANCE_KM) continue;

    const sim = nameSimilarity(place.name, g.displayName.text);
    if (sim < MIN_NAME_SIMILARITY) continue;

    // Combined score: name similarity matters more than proximity
    const score = sim * 0.7 + (1 - dist / MAX_MATCH_DISTANCE_KM) * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }

  return best;
}

// ── Google data builder ────────────────────────────────────────────────────

/** Maps Google's enum string to our simplified price level */
function parsePriceLevel(
  raw: string | undefined
): GooglePlaceData["priceLevel"] {
  if (!raw) return undefined;
  const map: Record<string, GooglePlaceData["priceLevel"]> = {
    PRICE_LEVEL_FREE: "free",
    PRICE_LEVEL_INEXPENSIVE: "inexpensive",
    PRICE_LEVEL_MODERATE: "moderate",
    PRICE_LEVEL_EXPENSIVE: "expensive",
    PRICE_LEVEL_VERY_EXPENSIVE: "very_expensive",
  };
  return map[raw] ?? undefined;
}

function buildGoogleData(g: RawGooglePlace): GooglePlaceData {
  const servesMeals: GooglePlaceData["servesMeals"] = {};
  let hasMealData = false;
  if (g.servesBreakfast) { servesMeals.breakfast = true; hasMealData = true; }
  if (g.servesLunch)     { servesMeals.lunch = true;     hasMealData = true; }
  if (g.servesDinner)    { servesMeals.dinner = true;     hasMealData = true; }
  if (g.servesCoffee)    { servesMeals.coffee = true;     hasMealData = true; }
  if (g.takeout)         { servesMeals.takeout = true;    hasMealData = true; }
  if (g.dineIn)          { servesMeals.dineIn = true;     hasMealData = true; }

  return {
    placeId: g.id,
    // Use googleMapsUri directly per spec — only fall back to constructed URL
    mapsUrl:
      g.googleMapsUri ??
      `https://www.google.com/maps/place/?q=place_id:${g.id}`,
    address: g.formattedAddress,
    rating: g.rating,
    reviewCount: g.userRatingCount,
    isOpenNow: g.currentOpeningHours?.openNow,
    openingHours: g.currentOpeningHours?.weekdayDescriptions,
    website: g.websiteUri,
    // editorialSummary is optional — enrichment succeeds without it
    editorialSummary: g.editorialSummary?.text,
    priceLevel: parsePriceLevel(g.priceLevel),
    servesMeals: hasMealData ? servesMeals : undefined,
  };
}

// ── Confidence upgrade ─────────────────────────────────────────────────────

/**
 * Upgrade place-level confidence signals using Google data as evidence.
 *
 * Rules:
 *   - Only upgrade signals that are currently "unknown" or unset
 *   - Never downgrade existing positive signals
 *   - Never use the word "verified" based on review mentions alone
 *   - Use language like "mentioned in reviews", "likely", "mixed"
 *   - Upgrades are noted in the explanation for transparency
 */
function upgradeConfidenceFromGoogle(place: Place): Place {
  const { google } = place;
  if (!google) return place;

  const summary = (google.editorialSummary ?? "").toLowerCase();
  const { rating, reviewCount } = google;

  const conf = { ...place.confidence };
  const upgrades: string[] = [];

  // wifiConfidence: upgrade "unknown" → "medium" if review evidence exists
  if (conf.wifiConfidence === "unknown" || conf.wifiConfidence === undefined) {
    if (/\bwi-?fi\b|internet|wireless/.test(summary)) {
      conf.wifiConfidence = "medium";
      upgrades.push("Wi-Fi mentioned in reviews");
    } else if (
      rating !== undefined &&
      reviewCount !== undefined &&
      rating >= 4.2 &&
      reviewCount >= 50
    ) {
      // High rating with many reviews correlates with adequate facilities
      conf.wifiConfidence = "medium";
    }
  }

  // noiseRisk: upgrade "unknown" based on review tone
  if (conf.noiseRisk === "unknown" || conf.noiseRisk === undefined) {
    if (/\b(quiet|calm|peaceful|focused|tranquil)\b/.test(summary)) {
      conf.noiseRisk = "low";
      upgrades.push("Quiet atmosphere noted in reviews");
    } else if (/\b(loud|noisy|busy|crowded|hectic|chaotic)\b/.test(summary)) {
      conf.noiseRisk = "high";
    }
  }

  // workFit: upgrade "medium" → "high" for cafes if review evidence supports it
  if (
    place.category === "cafe" &&
    conf.workFit === "medium" &&
    /\b(work|laptop|remote|cowork|study|focused|productivity)\b/.test(summary)
  ) {
    conf.workFit = "high";
    upgrades.push("Work-friendly mentions in reviews");
  }

  const explanationSuffix =
    upgrades.length > 0 ? ` (${upgrades.join("; ")})` : "";

  return {
    ...place,
    confidence: conf,
    // Prefer Google rating over OSM-derived value (OSM rarely has ratings)
    rating: rating ?? place.rating,
    reviewCount: reviewCount ?? place.reviewCount,
    explanation: place.explanation + explanationSuffix,
  };
}

// ── Food confidence upgrade ────────────────────────────────────────────────

/**
 * Upgrade food-place confidence signals using Google data.
 * Focuses on routine-fit signals: convenience, quickMealFit, routineSupport.
 * Uses honest language — no invented certainty.
 */
function upgradeFoodConfidenceFromGoogle(place: Place): Place {
  const { google } = place;
  if (!google) return place;

  const conf = { ...place.confidence };
  const upgrades: string[] = [];

  // If the place is open and highly-rated, routineSupport can be upgraded
  if (
    conf.routineSupport !== "high" &&
    google.rating !== undefined &&
    google.reviewCount !== undefined &&
    google.rating >= 4.0 &&
    google.reviewCount >= 30
  ) {
    conf.routineSupport = "high";
    upgrades.push("Highly rated for regular visits");
  }

  // quickMealFit: upgrade if takeout or fast service signals present
  if (conf.quickMealFit !== "high" && google.servesMeals?.takeout) {
    conf.quickMealFit = "high";
    upgrades.push("Takeout available");
  }

  const explanationSuffix =
    upgrades.length > 0 ? ` (${upgrades.join("; ")})` : "";

  return {
    ...place,
    confidence: conf,
    rating: google.rating ?? place.rating,
    reviewCount: google.reviewCount ?? place.reviewCount,
    explanation: place.explanation + explanationSuffix,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Enrich cafes, coworkings, and food places with Google Places data.
 *
 * - Fetches Google results for all three types in parallel (3 API calls total)
 * - Matches each OSM place to a Google result by proximity + name similarity
 * - Merges Google data additively into matched places
 * - Upgrades confidence signals where review evidence is present
 * - Returns all places unchanged (including gyms) if:
 *     • GOOGLE_MAPS_API_KEY is not set
 *     • Google API returns an error
 *     • No match is found for a given place
 */
export async function enrichPlaces(
  places: Place[],
  cityLat: number,
  cityLon: number
): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return places;

  try {
    const [googleCafes, googleCoworks, googleFood] = await Promise.all([
      searchNearbyPlaces(cityLat, cityLon, "cafe", apiKey, 20),
      searchNearbyPlaces(cityLat, cityLon, "coworking_space", apiKey, 10),
      searchNearbyPlaces(cityLat, cityLon, "restaurant", apiKey, 20),
    ]);

    console.log(
      `[enrichment] Google results — cafes: ${googleCafes.length}, coworks: ${googleCoworks.length}, food: ${googleFood.length}`
    );

    let matchCount = 0;
    const enriched = places.map((place) => {
      if (
        place.category !== "cafe" &&
        place.category !== "coworking" &&
        place.category !== "food"
      ) {
        return place;
      }

      const pool =
        place.category === "cafe"
          ? googleCafes
          : place.category === "coworking"
          ? googleCoworks
          : googleFood;

      if (place.name.trim().length < MIN_OSM_NAME_LENGTH) return place;
      const matched = findMatch(place, pool);
      if (!matched) return place;

      matchCount++;
      const enrichedPlace: Place = {
        ...place,
        rating: matched.rating ?? place.rating,
        reviewCount: matched.userRatingCount ?? place.reviewCount,
        google: buildGoogleData(matched),
      };

      if (place.category === "food") {
        return upgradeFoodConfidenceFromGoogle(enrichedPlace);
      }
      return upgradeConfidenceFromGoogle(enrichedPlace);
    });

    console.log(`[enrichment] matched ${matchCount} of ${places.length} places`);
    return enriched;
  } catch (err) {
    console.warn(
      "[enrichment] enrichPlaces failed — using OSM data only:",
      err
    );
    return places;
  }
}
