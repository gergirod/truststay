import { unstable_cache } from "next/cache";
import type { City, Place, PlaceCategory, DailyLifePlace, DailyLifePlaceType } from "@/types";
import { deriveConfidence } from "./confidence";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Roughly 5km radius at most latitudes
const BBOX_DELTA = 0.05;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

function buildBbox(lat: number, lon: number): string {
  return `${lat - BBOX_DELTA},${lon - BBOX_DELTA},${lat + BBOX_DELTA},${lon + BBOX_DELTA}`;
}

function classifyCategory(tags: Record<string, string>): PlaceCategory | null {
  const amenity = tags.amenity ?? "";
  const office = tags.office ?? "";
  const leisure = tags.leisure ?? "";

  if (office === "coworking" || amenity === "coworking_space") return "coworking";
  if (amenity === "cafe") return "cafe";
  if (
    leisure === "fitness_centre" ||
    amenity === "gym" ||
    leisure === "yoga" ||
    leisure === "sports_centre" ||
    amenity === "yoga_studio" ||
    leisure === "dance"
  ) return "gym";
  if (
    amenity === "restaurant" ||
    amenity === "fast_food" ||
    amenity === "food_court"
  )
    return "food";

  return null;
}

function getCoords(
  el: OverpassElement
): { lat: number; lon: number } | null {
  if (el.lat !== undefined && el.lon !== undefined) {
    return { lat: el.lat, lon: el.lon };
  }
  if (el.center) return el.center;
  return null;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function _fetchPlaces(city: City): Promise<Place[]> {
  const bbox = city.bbox
    ? `${city.bbox[0]},${city.bbox[1]},${city.bbox[2]},${city.bbox[3]}`
    : buildBbox(city.lat, city.lon);

  // timeout:20  → Overpass server gives up after 20s instead of default 180s
  // maxsize:1e6 → cap response at 1MB; dense cities (Recife, Arraial do Cabo)
  //               can return 10MB+ with no limit, causing 60s+ fetches
  const query = `
[out:json][timeout:20][maxsize:1000000];
(
  node["amenity"="cafe"](${bbox});
  way["amenity"="cafe"](${bbox});
  node["office"="coworking"](${bbox});
  way["office"="coworking"](${bbox});
  node["amenity"="coworking_space"](${bbox});
  way["amenity"="coworking_space"](${bbox});
  node["leisure"="fitness_centre"](${bbox});
  way["leisure"="fitness_centre"](${bbox});
  node["amenity"="gym"](${bbox});
  node["leisure"="yoga"](${bbox});
  way["leisure"="yoga"](${bbox});
  node["amenity"="yoga_studio"](${bbox});
  node["leisure"="sports_centre"](${bbox});
  way["leisure"="sports_centre"](${bbox});
  node["amenity"="restaurant"](${bbox});
  way["amenity"="restaurant"](${bbox});
  node["amenity"="fast_food"](${bbox});
  node["amenity"="food_court"](${bbox});
);
out center;
`.trim();

  // Try each endpoint in order — fall through to the next on error/timeout.
  let res: Response | undefined;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const attempt = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        next: { revalidate: 3600 },
        // Client-side safety net: abort after 25s (5s buffer over Overpass timeout)
        signal: AbortSignal.timeout(25000),
      });
      if (attempt.ok) {
        res = attempt;
        break;
      }
      console.warn(`[overpass] ${endpoint} returned ${attempt.status} — trying next`);
    } catch (err) {
      console.warn(`[overpass] ${endpoint} failed:`, err);
    }
  }

  if (!res) {
    console.error("[overpass] all endpoints failed");
    return [];
  }

  let json: { elements: OverpassElement[] };
  try {
    json = await res.json();
    console.log(`[overpass] elements returned: ${json.elements?.length ?? 0} for bbox ${bbox}`);
  } catch (err) {
    console.error("[overpass] JSON parse failed:", err);
    return [];
  }

  const places: Place[] = [];
  const seen = new Set<string>();

  for (const el of json.elements) {
    const coords = getCoords(el);
    if (!coords) continue;

    const category = classifyCategory(el.tags);
    if (!category) continue;

    const name = el.tags.name ?? el.tags["name:en"];
    if (!name?.trim()) continue;

    // Deduplicate: same name + category can appear as both node and way
    const key = `${category}:${name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distanceKm =
      Math.round(
        haversineKm(city.lat, city.lon, coords.lat, coords.lon) * 10
      ) / 10;

    const { confidence, bestFor, explanation } = deriveConfidence(
      el.tags,
      category,
      distanceKm
    );

    places.push({
      id: `osm-${el.type}-${el.id}`,
      name: name.trim(),
      category,
      lat: coords.lat,
      lon: coords.lon,
      distanceKm,
      confidence,
      bestFor,
      explanation,
    });
  }

  return places;
}

/**
 * Cached version of _fetchPlaces.
 * next: { revalidate } has no effect on POST fetches — unstable_cache is the
 * only way to persist Overpass results across requests on the server.
 */
export const fetchPlaces = unstable_cache(
  _fetchPlaces,
  ["overpass-places"],
  { revalidate: 3600 }
);

// ── Daily-life places fetch ───────────────────────────────────────────────────

function classifyDailyLifeType(tags: Record<string, string>): DailyLifePlaceType | null {
  const shop = tags.shop ?? "";
  const amenity = tags.amenity ?? "";
  if (shop === "supermarket" || shop === "grocery") return "grocery";
  if (shop === "convenience") return "convenience";
  if (amenity === "pharmacy" || shop === "pharmacy") return "pharmacy";
  if (shop === "laundry" || amenity === "laundry") return "laundry";
  return null;
}

async function _fetchDailyLifePlaces(city: City): Promise<DailyLifePlace[]> {
  const bbox = city.bbox
    ? `${city.bbox[0]},${city.bbox[1]},${city.bbox[2]},${city.bbox[3]}`
    : buildBbox(city.lat, city.lon);

  const query = `
[out:json][timeout:15][maxsize:500000];
(
  node["shop"="supermarket"](${bbox});
  node["shop"="grocery"](${bbox});
  node["shop"="convenience"](${bbox});
  node["amenity"="pharmacy"](${bbox});
  node["shop"="pharmacy"](${bbox});
  node["shop"="laundry"](${bbox});
  node["amenity"="laundry"](${bbox});
);
out center;
`.trim();

  let res: Response | undefined;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const attempt = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(20000),
      });
      if (attempt.ok) { res = attempt; break; }
      console.warn(`[overpass-daily-life] ${endpoint} returned ${attempt.status} — trying next`);
    } catch (err) {
      console.warn(`[overpass-daily-life] ${endpoint} failed:`, err);
    }
  }

  if (!res) {
    console.error("[overpass-daily-life] all endpoints failed");
    return [];
  }

  let json: { elements: OverpassElement[] };
  try {
    json = await res.json();
    console.log(`[overpass-daily-life] elements returned: ${json.elements?.length ?? 0} for ${city.slug}`);
  } catch (err) {
    console.error("[overpass-daily-life] JSON parse failed:", err);
    return [];
  }

  const places: DailyLifePlace[] = [];
  const seen = new Set<string>();

  for (const el of json.elements) {
    const coords = getCoords(el);
    if (!coords) continue;

    const type = classifyDailyLifeType(el.tags);
    if (!type) continue;

    const name = el.tags.name ?? el.tags["name:en"] ?? type;
    const key = `${type}:${name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const distanceKm =
      Math.round(haversineKm(city.lat, city.lon, coords.lat, coords.lon) * 10) / 10;

    places.push({
      id: `osm-${el.type}-${el.id}`,
      type,
      name: name.trim(),
      lat: coords.lat,
      lon: coords.lon,
      distanceKm,
    });
  }

  return places;
}

export const fetchDailyLifePlaces = unstable_cache(
  _fetchDailyLifePlaces,
  ["overpass-daily-life"],
  { revalidate: 86400 }
);

export function sortByDistance(places: Place[]): Place[] {
  return [...places].sort(
    (a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)
  );
}

/**
 * Sort places so that Google-enriched places appear before OSM-only ones,
 * while still sorting by distance within each tier.
 * This ensures the few enriched places (with ratings, hours, Maps links)
 * are visible at the top of each section rather than buried.
 */
export function sortEnrichedFirst(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    const aEnriched = a.google ? 0 : 1;
    const bEnriched = b.google ? 0 : 1;
    if (aEnriched !== bEnriched) return aEnriched - bEnriched;
    return (a.distanceFromBasekm ?? a.distanceKm ?? 99) -
           (b.distanceFromBasekm ?? b.distanceKm ?? 99);
  });
}
