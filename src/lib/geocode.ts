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
  url.searchParams.set("limit", "1");
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

  const result = results[0];
  const address = result.address ?? {};

  // Prefer the most specific city-level name available
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    result.display_name.split(",")[0].trim();

  const country = address.country ?? "";

  return {
    name: cityName,
    slug: toSlug(cityName),
    country,
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
}
