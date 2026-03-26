import type { Place, PlaceCategory } from "@/types";
import { deriveConfidence } from "./confidence";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

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
  if (leisure === "fitness_centre" || amenity === "gym") return "gym";
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

export async function fetchPlaces(
  cityLat: number,
  cityLon: number
): Promise<Place[]> {
  const bbox = buildBbox(cityLat, cityLon);

  const query = `
[out:json][timeout:30];
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
  node["amenity"="restaurant"](${bbox});
  way["amenity"="restaurant"](${bbox});
  node["amenity"="fast_food"](${bbox});
  node["amenity"="food_court"](${bbox});
);
out center;
`.trim();

  let res: Response;
  try {
    res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    });
  } catch {
    return [];
  }

  if (!res.ok) return [];

  let json: { elements: OverpassElement[] };
  try {
    json = await res.json();
  } catch {
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
        haversineKm(cityLat, cityLon, coords.lat, coords.lon) * 10
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

export function sortByDistance(places: Place[]): Place[] {
  return [...places].sort(
    (a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99)
  );
}
