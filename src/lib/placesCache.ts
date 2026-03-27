import { getPlacesCache, savePlacesCache } from "@/lib/kv";
import { fetchPlaces } from "@/lib/overpass";
import type { City, Place } from "@/types";

/**
 * Returns the place list for a city, using KV cache when available.
 *
 * Cache hit  → instant (~5 ms), no Overpass call
 * Cache miss → fetches from Overpass (~3-8 s), then saves to KV for 14 days
 *
 * KV is not configured → always falls back to live Overpass fetch.
 */
export async function getPlacesWithCache(city: City): Promise<Place[]> {
  // Try KV first
  const cached = await getPlacesCache(city.slug);
  if (cached) {
    return cached.places;
  }

  // Live fetch from Overpass
  const places = await fetchPlaces(city);

  // Persist to KV in the background — don't block the response
  savePlacesCache(city.slug, city.name, places).catch(() => {
    // Non-fatal: site works fine without KV
  });

  return places;
}
