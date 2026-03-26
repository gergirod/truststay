export interface City {
  name: string;
  slug: string;
  country: string;
  lat: number;
  lon: number;
  /** Bounding box [south, west, north, east] — present for neighbourhood/district searches.
   *  When set, Overpass uses this bbox directly instead of the fixed lat/lon radius. */
  bbox?: [number, number, number, number];
  /** Parent city name — present when the search result is a neighbourhood or district.
   *  Shown as a subtitle on the city page (e.g. "El Poblado" in "Medellín"). */
  parentCity?: string;
}

export interface CitySummary {
  routineScore: number;
  summaryText: string;
  recommendedArea: string;
  confidence: "low" | "medium" | "high";
  areaReason?: string;
}

export interface PlaceConfidence {
  workFit?: "low" | "medium" | "high";
  noiseRisk?: "low" | "medium" | "high" | "unknown";
  wifiConfidence?: "weak" | "medium" | "verified" | "unknown";
  laptopFriendly?: "yes" | "likely" | "mixed" | "unknown";
  routineFit?: "low" | "medium" | "high";
  convenience?: "low" | "medium" | "high";
  quickMealFit?: "low" | "medium" | "high";
  routineSupport?: "low" | "medium" | "high";
}

export type BestForTag =
  | "quick_stop"
  | "backup_work"
  | "deep_work"
  | "calls"
  | "short_session"
  | "coffee_break"
  | "training"
  | "quick_meal"
  | "routine_support";

export type PlaceCategory = "cafe" | "coworking" | "gym" | "food";

/**
 * Data sourced from Google Places API enrichment.
 * Present on cafes, coworkings, and food places that matched a Google result.
 * All fields except placeId and mapsUrl are optional — enrichment is
 * considered successful even if only partial data is returned.
 */
export interface GooglePlaceData {
  placeId: string;
  mapsUrl: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  isOpenNow?: boolean;
  openingHours?: string[]; // e.g. ["Monday: 8:00 AM – 9:00 PM", ...]
  website?: string;
  editorialSummary?: string;
  /** Google price level — present for food places if returned by the API */
  priceLevel?: "free" | "inexpensive" | "moderate" | "expensive" | "very_expensive";
  /** Meal service signals from Google — food places only */
  servesMeals?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    coffee?: boolean;
    takeout?: boolean;
    dineIn?: boolean;
  };
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  rating?: number;
  reviewCount?: number;
  /** Distance from the geocoded city centre (Nominatim result). */
  distanceKm?: number;
  /** Distance from the computed work-cluster centroid (cafes + coworkings).
   *  More actionable than distanceKm for "how far is this from where I'd stay?" */
  distanceFromBasekm?: number;
  confidence: PlaceConfidence;
  bestFor: BestForTag[];
  explanation: string;
  /** Present only for cafes/coworkings successfully matched to a Google Place. */
  google?: GooglePlaceData;
}
