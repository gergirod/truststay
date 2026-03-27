/**
 * Auto-discovers neighborhoods for any city using Overpass API.
 *
 * Flow:
 *  1. Single Overpass query: place=suburb/neighbourhood + cafes/coworkings/gyms within city radius
 *  2. Score each neighbourhood by POI density within 700m
 *  3. Filter to those with score >= MIN_POI_SCORE
 *  4. Deduplicate by slug, sort by score, take top MAX_RESULTS
 *  5. Return as NeighborhoodEntry[] — same shape as curated entries
 *
 * Result is cached for 24 hours (Overpass + next revalidate).
 * Falls back to [] on any error so the city page gracefully shows normal content.
 */

import { unstable_cache } from "next/cache";
import type { City } from "@/types";
import { haversineKm } from "@/lib/overpass";
import { toSlug } from "@/lib/geocode";
import type { NeighborhoodEntry } from "@/data/neighborhoods";

// ─── Config ──────────────────────────────────────────────────────────────────

/** Degree radius around city centre used to query Overpass (~8–9 km) */
const QUERY_RADIUS_DEG = 0.08;

/** Radius in km within which POIs are counted toward a neighbourhood's score */
const POI_RADIUS_KM = 0.7;

/** Minimum score to include a neighbourhood (avoids empty suburbs) */
const MIN_POI_SCORE = 3;

/** Max number of neighbourhoods to return */
const MAX_RESULTS = 8;

/** Half-width in degrees for the auto-generated neighbourhood bbox (~1.5 km) */
const BBOX_HALF_DEG = 0.018;

/**
 * Minimum distance in km between the two farthest neighborhoods.
 * Cities where all neighborhoods are closer than this are "compact cities"
 * (walkable in under 30 min) — showing a pick-a-neighborhood grid adds no
 * value. Examples: Antigua (~3km), Oaxaca (~4km), San Cristóbal.
 * Examples that pass: Buenos Aires (~12km), Bangkok (~9km), Berlin (~11km).
 */
const MIN_CITY_SPREAD_KM = 3.5;

/**
 * Maximum distance from city center for a discovered neighborhood to be
 * considered part of that city. Prevents pulling in neighborhoods from
 * neighboring towns when the Overpass query radius overlaps them.
 * Example: San Marcos La Laguna → "Minerva" is from Quetzaltenango 10km away.
 */
const MAX_NEIGHBORHOOD_DISTANCE_KM = 5.0;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface ScoredNeighbourhood {
  name: string;
  lat: number;
  lon: number;
  cafes: number;
  coworkings: number;
  gyms: number;
  score: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQueryBbox(lat: number, lon: number): string {
  const r = QUERY_RADIUS_DEG;
  return `${lat - r},${lon - r},${lat + r},${lon + r}`;
}

function buildNeighbourhoodBbox(
  lat: number,
  lon: number
): [number, number, number, number] {
  const h = BBOX_HALF_DEG;
  return [lat - h, lon - h, lat + h, lon + h];
}

function computeDirection(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): NeighborhoodEntry["directionFromCenter"] {
  const dlat = toLat - fromLat;
  const dlon = toLon - fromLon;
  const absDlat = Math.abs(dlat);
  const absDlon = Math.abs(dlon);

  if (absDlat < 0.004 && absDlon < 0.004) return "Center";
  if (absDlat > absDlon * 2) return dlat > 0 ? "N" : "S";
  if (absDlon > absDlat * 2) return dlon > 0 ? "E" : "W";
  if (dlat > 0 && dlon > 0) return "NE";
  if (dlat > 0 && dlon < 0) return "NW";
  if (dlat < 0 && dlon > 0) return "SE";
  return "SW";
}

function generateTagline(cafes: number, coworkings: number, gyms: number): string {
  const parts: string[] = [];

  if (coworkings >= 2) parts.push(`${coworkings} coworkings`);
  else if (coworkings === 1) parts.push("1 coworking");

  if (cafes >= 6) parts.push("dense café scene");
  else if (cafes >= 3) parts.push(`${cafes} cafés`);
  else if (cafes >= 1) parts.push(`${cafes} café${cafes > 1 ? "s" : ""}`);

  if (gyms >= 2) parts.push(`${gyms} gyms`);
  else if (gyms === 1) parts.push("gym nearby");

  if (parts.length === 0) return "Local area — explore places for details";
  return parts.join(" · ");
}

// ─── Overpass fetch ───────────────────────────────────────────────────────────

async function fetchNeighbourhoodsAndPOIs(
  city: City
): Promise<OverpassElement[]> {
  const bbox = buildQueryBbox(city.lat, city.lon);

  // Single query: neighbourhood nodes/ways + cafes/coworkings/gyms
  const query = `[out:json][timeout:20][maxsize:500000];
(
  node["place"~"suburb|neighbourhood"]["name"](${bbox});
  way["place"~"suburb|neighbourhood"]["name"](${bbox});
  node["amenity"~"cafe|coworking_space|gym"](${bbox});
);
out center 500;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        next: { revalidate: 86400 }, // 24 h cache
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      return (json.elements as OverpassElement[]) ?? [];
    } catch {
      continue;
    }
  }

  return [];
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Discovers and scores neighborhoods for a city automatically.
 * Returns [] on failure or when data is too sparse.
 */
async function _discoverNeighborhoods(
  city: City
): Promise<NeighborhoodEntry[]> {
  try {
    const elements = await fetchNeighbourhoodsAndPOIs(city);
    if (elements.length === 0) return [];

    // Split into neighbourhood nodes and POI nodes
    const neighbourhoodElements = elements.filter(
      (e) => e.tags?.place === "suburb" || e.tags?.place === "neighbourhood"
    );
    const poiElements = elements.filter((e) => e.tags?.amenity);

    if (neighbourhoodElements.length === 0) return [];

    // Score each neighbourhood by nearby POI density
    const scored: ScoredNeighbourhood[] = [];

    for (const n of neighbourhoodElements) {
      const lat = n.lat ?? n.center?.lat;
      const lon = n.lon ?? n.center?.lon;
      const name = n.tags?.name ?? "";

      // Skip entries without coords or a usable name
      if (!lat || !lon || name.length < 3) continue;

      // Count each POI type within radius
      let cafes = 0;
      let coworkings = 0;
      let gyms = 0;

      for (const p of poiElements) {
        const pLat = p.lat ?? p.center?.lat;
        const pLon = p.lon ?? p.center?.lon;
        if (!pLat || !pLon) continue;
        if (haversineKm(lat, lon, pLat, pLon) > POI_RADIUS_KM) continue;

        const amenity = p.tags?.amenity;
        if (amenity === "cafe") cafes++;
        else if (amenity === "coworking_space") coworkings++;
        else if (amenity === "gym") gyms++;
      }

      // Weighted score: coworkings matter most for remote workers
      const score = cafes * 2 + coworkings * 4 + gyms * 1;
      if (score < MIN_POI_SCORE) continue;

      scored.push({ name, lat, lon, cafes, coworkings, gyms, score });
    }

    if (scored.length === 0) return [];

    // Deduplicate by slug (OSM sometimes has node + way for the same area)
    const seen = new Set<string>();
    const deduped = scored.filter((n) => {
      const slug = toSlug(n.name);
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });

    // ── Distance filter ──────────────────────────────────────────────────────
    // Discard neighborhoods that are too far from the city center — they
    // belong to a neighboring town, not to this city.
    const nearby = deduped.filter((n) => {
      const d = haversineKm(city.lat, city.lon, n.lat, n.lon);
      if (d > MAX_NEIGHBORHOOD_DISTANCE_KM) {
        console.log(
          `[neighborhoodDiscovery] skipping "${n.name}" — ${d.toFixed(1)}km from ${city.name} center (limit ${MAX_NEIGHBORHOOD_DISTANCE_KM}km)`
        );
        return false;
      }
      return true;
    });

    // Need at least 3 neighborhoods nearby to justify showing a grid
    if (nearby.length < 3) return [];

    // Sort by density score, take top N
    nearby.sort((a, b) => b.score - a.score);
    const top = nearby.slice(0, MAX_RESULTS);

    // ── Compact city check ───────────────────────────────────────────────────
    // If all neighborhoods are tightly clustered, the city is too small to
    // benefit from a "pick a neighborhood" grid. Return [] so the caller falls
    // back to the normal city page (full place list).
    if (top.length >= 2) {
      let maxSpreadKm = 0;
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          const d = haversineKm(top[i].lat, top[i].lon, top[j].lat, top[j].lon);
          if (d > maxSpreadKm) maxSpreadKm = d;
        }
      }
      if (maxSpreadKm < MIN_CITY_SPREAD_KM) {
        console.log(
          `[neighborhoodDiscovery] ${city.name} is compact (spread=${maxSpreadKm.toFixed(1)}km < ${MIN_CITY_SPREAD_KM}km) — showing city page instead of grid`
        );
        return [];
      }
    }

    return top.map((n) => ({
      name: n.name,
      slug: toSlug(n.name),
      lat: n.lat,
      lon: n.lon,
      bbox: buildNeighbourhoodBbox(n.lat, n.lon),
      tagline: generateTagline(n.cafes, n.coworkings, n.gyms),
      directionFromCenter: computeDirection(city.lat, city.lon, n.lat, n.lon),
      distanceFromCenterKm:
        Math.round(haversineKm(city.lat, city.lon, n.lat, n.lon) * 10) / 10,
    }));
  } catch (err) {
    console.warn("[neighborhoodDiscovery] Failed for", city.name, ":", err);
    return [];
  }
}

/**
 * Cached wrapper — Overpass POST requests are not cached by Next.js fetch cache,
 * so unstable_cache is required to persist results across requests.
 * 24-hour revalidation matches the neighborhood topology change rate.
 */
export const discoverNeighborhoods = unstable_cache(
  _discoverNeighborhoods,
  ["neighborhood-discovery"],
  { revalidate: 86400 }
);
