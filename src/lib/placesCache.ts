import { getPlacesCache, savePlacesCache } from "@/lib/kv";
import { fetchPlaces } from "@/lib/overpass";
import type { City, Place } from "@/types";

/** Max age before we re-run Google enrichment even if enrichedAt is set (7 days) */
const ENRICHMENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns the place list for a city, using KV cache when available.
 *
 * Cache hit  → instant (~5 ms), no Overpass call
 * Cache miss → fetches from Overpass (~3-8 s), then saves to KV for 14 days
 *
 * KV is not configured → always falls back to live Overpass fetch.
 *
 * Returns { places, needsEnrichment } so the caller knows whether to run
 * Google enrichment and save the result back to KV.
 */
export async function getPlacesWithCache(
  city: City
): Promise<{ places: Place[]; needsEnrichment: boolean; cachedAt?: string }> {
  const cached = await getPlacesCache(city.slug);

  if (cached) {
    const enrichmentStale =
      !cached.enrichedAt ||
      Date.now() - new Date(cached.enrichedAt).getTime() > ENRICHMENT_MAX_AGE_MS;
    return {
      places: cached.places,
      needsEnrichment: enrichmentStale,
      cachedAt: cached.cachedAt,
    };
  }

  // Live fetch from Overpass
  const places = await fetchPlaces(city);

  // Persist to KV in the background — don't block the response
  savePlacesCache(city.slug, city.name, places).catch(() => {});

  return { places, needsEnrichment: true };
}

/**
 * Save Google-enriched places back to KV so future visits skip the Google API.
 * Preserves the original cachedAt timestamp; sets enrichedAt to now.
 */
export function saveEnrichedPlaces(
  city: City,
  enrichedPlaces: Place[],
  originalCachedAt?: string
): void {
  savePlacesCache(city.slug, city.name, enrichedPlaces, {
    enriched: true,
    existingCachedAt: originalCachedAt,
  }).catch(() => {});
}
