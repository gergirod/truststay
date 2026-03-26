import type { City } from "@/types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// Nominatim requires a descriptive User-Agent identifying the app and contact.
const USER_AGENT = "Trustay/1.0 (trustay.app; contact@trustay.app)";

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function geocodeCity(query: string): Promise<City | null> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5"); // Fetch multiple; pickBestResult selects the most useful
  url.searchParams.set("addressdetails", "1");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      // Cache on the server for 1 hour — also reduces Nominatim load
      next: { revalidate: 3600 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let results: NominatimResult[];
  try {
    results = await res.json();
  } catch {
    return null;
  }

  if (!results.length) return null;

  const result = pickBestResult(results, query)!;
  const address = result.address ?? {};
  const country = address.country ?? "";
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  // Detect area-level results (neighbourhood, suburb, quarter, city_district,
  // or natural features like lakes/islands that have a usable bbox).
  const isAreaResult =
    (result.type ? AREA_TYPES.has(result.type) : false) ||
    (result.class === "water" && NATURAL_TYPES.has(result.type ?? "")) ||
    (result.class === "natural" && NATURAL_TYPES.has(result.type ?? ""));

  if (isAreaResult) {
    // For natural features (lake, island), prefer the feature name itself.
    // For sub-city areas, prefer the most specific address component.
    const isNaturalFeature =
      result.class === "water" || result.class === "natural";

    const areaName = isNaturalFeature
      ? (address.lake ??
          address.island ??
          address.water ??
          result.display_name.split(",")[0].trim())
      : (address.neighbourhood ??
          address.suburb ??
          address.quarter ??
          address.city_district ??
          result.display_name.split(",")[0].trim());

    const parentCity = isNaturalFeature
      // For lakes/islands, skip city/town/village — a nearby village is not a
      // meaningful "parent" for a lake. Use state/county for location context only.
      ? (address.state ?? address.county ?? undefined)
      : (address.city ??
          address.town ??
          address.village ??
          address.municipality ??
          undefined);

    // Nominatim boundingbox: [minlat, maxlat, minlon, maxlon]
    // Convert to Overpass order: [south, west, north, east]
    // Natural features (lakes/islands) can be larger — allow up to 0.8°.
    // Sub-city areas stay at ≤ 0.3° to avoid city-sized bboxes.
    const maxBboxSpan = isNaturalFeature ? 0.8 : 0.3;
    let bbox: [number, number, number, number] | undefined;
    if (result.boundingbox && result.boundingbox.length === 4) {
      const [minlat, maxlat, minlon, maxlon] = result.boundingbox.map(Number);
      if (maxlat - minlat <= maxBboxSpan && maxlon - minlon <= maxBboxSpan) {
        bbox = [minlat, minlon, maxlat, maxlon];
      }
    }

    return {
      name: areaName,
      slug: toSlug(areaName),
      country,
      lat,
      lon,
      bbox,
      parentCity,
    };
  }

  // Standard city-level result — include hamlet and county as fallbacks so
  // small villages (e.g. "San Marcos La Laguna") and boundary results resolve.
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.hamlet ??
    address.county ??
    result.display_name.split(",")[0].trim();

  return {
    name: cityName,
    slug: toSlug(cityName),
    country,
    lat,
    lon,
  };
}

/** Sub-city place types that should use the Nominatim bbox directly */
const AREA_TYPES = new Set([
  "neighbourhood",
  "suburb",
  "quarter",
  "city_district",
  "residential",
]);

/** Natural/water feature types — use bbox to cover the area around them */
const NATURAL_TYPES = new Set([
  "lake",
  "water",
  "bay",
  "island",
  "river",
  "sea",
  "reservoir",
]);

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  /** Nominatim feature class — e.g. "place", "boundary", "water", "highway" */
  class?: string;
  /** Nominatim feature type — e.g. "city", "neighbourhood", "lake" */
  type?: string;
  /** [minlat, maxlat, minlon, maxlon] — note Nominatim's non-standard order */
  boundingbox?: string[];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    county?: string;
    country?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    lake?: string;
    island?: string;
    water?: string;
    state?: string;
  };
}

/**
 * Pick the most useful Nominatim result from a list.
 * Prioritises actual settlements over roads, streets, and ambiguous features.
 *
 * Tiers (first match wins):
 *   1. place class: city / town / village / hamlet — clear settlements
 *   2. boundary administrative — municipal/district boundaries
 *   3. natural features with a usable bbox (lake, island, etc.)
 *   4. any remaining place class result
 *   5. fallback to first result
 */
/** Keywords that signal the user is looking for a natural feature, not a city. */
const NATURAL_KEYWORDS = /\b(lago|lake|laguna|río|rio|river|island|isla|mar|sea|gulf|bay|bahia)\b/i;

function pickBestResult(
  results: NominatimResult[],
  query?: string
): NominatimResult | null {
  if (!results.length) return null;

  const isSettlement = (r: NominatimResult) =>
    r.class === "place" &&
    ["city", "town", "village", "hamlet", "municipality"].includes(r.type ?? "");

  const isAdminBoundary = (r: NominatimResult) =>
    r.class === "boundary" && r.type === "administrative";

  const isNatural = (r: NominatimResult) =>
    (r.class === "water" || r.class === "natural") &&
    NATURAL_TYPES.has(r.type ?? "");

  const isAnyPlace = (r: NominatimResult) => r.class === "place";

  // If the query contains natural-feature keywords (e.g. "Lago Atitlan"),
  // prioritise matching natural results over settlements to avoid picking up
  // unrelated towns whose display_name happens to include the query string.
  if (query && NATURAL_KEYWORDS.test(query)) {
    return (
      results.find(isNatural) ??
      results.find(isSettlement) ??
      results.find(isAdminBoundary) ??
      results.find(isAnyPlace) ??
      results[0]
    );
  }

  return (
    results.find(isSettlement) ??
    results.find(isAdminBoundary) ??
    results.find(isNatural) ??
    results.find(isAnyPlace) ??
    results[0]
  );
}

/**
 * Reverse geocode a lat/lon to the most specific neighbourhood-level name
 * available from Nominatim. Returns null on any failure so callers can fall
 * back gracefully to "Central {city}".
 */
export async function reverseGeocodeArea(
  lat: number,
  lon: number
): Promise<string | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "16");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let result: NominatimResult;
  try {
    result = await res.json();
  } catch {
    return null;
  }

  const address = result.address ?? {};

  return (
    address.neighbourhood ??
    address.suburb ??
    address.quarter ??
    address.city_district ??
    null
  );
}
