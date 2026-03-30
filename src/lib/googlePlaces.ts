/**
 * Google Places API (New) client.
 *
 * Only one public function is exposed:
 *   searchNearbyPlaces()  — one Nearby Search call, returns raw results
 *
 * Usage is intentionally minimal to control cost:
 *   - Only cafes, coworkings, and restaurants are ever searched
 *   - Results are cached for 1 hour via Next.js fetch cache
 *   - Field mask excludes photos, individual reviews, and other expensive fields
 *   - Called only from server-side code (GOOGLE_MAPS_API_KEY stays server-only)
 */

import { unstable_cache } from "next/cache";

const PLACES_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchNearby";

/**
 * Subset of the Google Places (New) API response we care about.
 * All fields beyond id are optional — the enrichment layer handles absences.
 */
export interface RawGooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: { text: string; languageCode?: string };
  /** Price level — returned for restaurant-type places */
  priceLevel?: string;
  /** Meal service boolean signals — food places */
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesCoffee?: boolean;
  takeout?: boolean;
  dineIn?: boolean;
}

// Minimal field mask — Basic + Advanced tier fields, no photos or individual reviews
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.editorialSummary",
  "places.priceLevel",
  "places.servesBreakfast",
  "places.servesLunch",
  "places.servesDinner",
  "places.servesCoffee",
  "places.takeout",
  "places.dineIn",
].join(",");

/**
 * Search for places of a given type near a coordinate.
 * Returns an empty array on any failure — callers must handle the no-data case.
 *
 * @param lat        City centre latitude
 * @param lon        City centre longitude
 * @param type       Google Places type
 * @param apiKey     GOOGLE_MAPS_API_KEY
 * @param maxResults Hard cap on results (controls cost)
 */
async function _searchNearbyPlaces(
  lat: number,
  lon: number,
  type: "cafe" | "coworking_space" | "restaurant" | "gym",
  apiKey: string,
  maxResults: number
): Promise<RawGooglePlace[]> {
  try {
    const res = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: 8000,
          },
        },
        includedTypes: [type],
        maxResultCount: maxResults,
      }),
      // Same cache strategy as Overpass — 1 hour revalidation
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(
        `[googlePlaces] searchNearby HTTP ${res.status} for type=${type}`
      );
      return [];
    }

    const data = (await res.json()) as { places?: RawGooglePlace[] };
    return data.places ?? [];
  } catch (err) {
    console.warn("[googlePlaces] searchNearby error:", err);
    return [];
  }
}

/**
 * Cached wrapper — Google Places uses POST, so Next.js fetch cache ignores
 * the next: { revalidate } hint. unstable_cache persists results server-side.
 */
export const searchNearbyPlaces = unstable_cache(
  _searchNearbyPlaces,
  ["google-places-nearby"],
  { revalidate: 3600 }
);

// ── Place Details (with reviews) ─────────────────────────────────────────────

export interface PlaceReview {
  text: string;
  rating: number;
  authorName: string;
  relativePublishTimeDescription: string; // e.g. "3 months ago"
}

export interface RawGooglePlaceDetails extends RawGooglePlace {
  reviews?: PlaceReview[];
}

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "currentOpeningHours",
  "websiteUri",
  "googleMapsUri",
  "editorialSummary",
  "priceLevel",
  "reviews",
].join(",");

async function _fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<RawGooglePlaceDetails | null> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
        // 24h cache — place details don't change often
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) {
      console.warn(`[googlePlaces] fetchPlaceDetails HTTP ${res.status} for ${placeId}`);
      return null;
    }
    return (await res.json()) as RawGooglePlaceDetails;
  } catch (err) {
    console.warn("[googlePlaces] fetchPlaceDetails error:", err);
    return null;
  }
}

/**
 * Fetch full Place Details including up to 5 reviews for a single place.
 * Uses unstable_cache (24h) to avoid redundant API calls.
 * reviews field = "Preferred" tier (~$0.017/request).
 */
export const fetchPlaceDetails = unstable_cache(
  _fetchPlaceDetails,
  ["google-place-details"],
  { revalidate: 86400 }
);
