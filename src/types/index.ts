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
  /** Optional 1-sentence explanation of why this area is the right base.
   *  Populated from KV narrative (admin-generated) or algorithmic fallback. */
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

export type PlaceCategory = "cafe" | "coworking" | "gym" | "food" | "essential";

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
  /** "community" when the place was added from a user suggestion override */
  source?: "community";
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

// ── Stay intent ───────────────────────────────────────────────────────────────

export type StayPurpose =
  | "surf" | "dive" | "hike" | "yoga" | "kite"
  | "work_first" | "exploring";

export type WorkStyle = "light" | "balanced" | "heavy";

export type VibePreference = "social" | "local" | "quiet";

/**
 * What should dominate the stay when activity-goals and work-goals compete.
 * Decouples "how much work" (WorkStyle) from "what shapes the base location choice."
 *
 * purpose_first  — activity defines the days; work fits around it.
 *                  Base is chosen for activity proximity; work coverage is secondary.
 * balanced       — activity and work both matter roughly equally.
 * work_first     — work blocks are protected; activity fills the gaps.
 *                  Base is chosen for work infrastructure; activity is nearby if possible.
 */
export type DailyBalance = "purpose_first" | "balanced" | "work_first";

export interface StayIntent {
  purpose: StayPurpose;
  workStyle: WorkStyle;
  /**
   * What should shape the base area choice when purpose and work compete.
   * Optional for backward compat — scoring falls back to "balanced" when absent.
   */
  dailyBalance?: DailyBalance;
  /** Kept for type-system backward compat — not yet used in scoring. */
  vibe?: VibePreference;
}

export type FitProfile =
  | "activity_light_work"
  | "activity_balanced_work"
  | "work_primary"
  | "generic";

// ── Daily-life essentials ─────────────────────────────────────────────────────

export type DailyLifePlaceType = "grocery" | "convenience" | "pharmacy" | "laundry";

export interface DailyLifePlace {
  id: string;
  type: DailyLifePlaceType;
  name: string;
  lat: number;
  lon: number;
  distanceKm: number;
}

// ── Stay fit result ───────────────────────────────────────────────────────────

/**
 * Raw, profile-independent score vector for a city/neighborhood.
 *
 * Designed for future city-similarity queries: "more places like this for
 * surf + calm work" or "similar daily-life rhythm." Cosine similarity between
 * two cities' vectors gives a meaningful distance without re-running scoring.
 *
 * All values are 0–100. Do NOT use these directly for stay-fit display —
 * use scoreBreakdown (which applies profile weights) instead.
 */
export interface StayScoreVector {
  /** Profile-weighted work fit — changes by profile */
  workFit: number;
  /** Combined daily-life fit */
  dailyLifeFit: number;
  /** Food + café density within 1.5km (profile-independent) */
  foodSupport: number;
  /** Grocery/convenience access within 1.5km (profile-independent) */
  groceryAccess: number;
  /** Pharmacy access within 2km (profile-independent) */
  pharmacyAccess: number;
  /** Coworking density raw signal */
  coworkingDensity: number;
  /** High-work-fit café density raw signal */
  cafeDensity: number;
}

export interface StayFitResult {
  profile: FitProfile;
  baseArea: string;
  /** Profile-weighted composite score (0–100) */
  fitScore: number;
  fitLabel: "Strong" | "Moderate" | "Limited" | "Unknown";
  confidence: "high" | "medium" | "low";

  scoreBreakdown: {
    workFit: number;
    /** null = not yet computed (milestone 1); honesty > fake 0 */
    purposeFit: number | null;
    dailyLifeFit: number;
    dailyLifeDetail: {
      foodSustainability: number;
      groceryAccess: number;
      pharmacyAccess: number;
    };
  };

  /**
   * Raw, profile-independent scores for future city-similarity queries.
   * Not displayed to users — used by the similarity engine later.
   */
  scoreVector: StayScoreVector;

  purposeAccessLevel: "strong" | "moderate" | "limited" | "unknown";
  purposeAccessNote: string | null;

  redFlags: string[];
  dataGaps: string[];

  topWorkPlaces: Array<{
    id: string;
    name: string;
    category: PlaceCategory;
    distanceFromBasekm: number | null;
    lat: number;
    lon: number;
  }>;

  topDailyLifePlaces: Array<{
    type: DailyLifePlaceType;
    name: string;
    distanceKm: number;
    lat: number;
    lon: number;
  }>;

  /** Structured inputs for the LLM narrative layer (milestone 3). */
  narrativeInputs: {
    profile: FitProfile;
    purpose: StayPurpose;
    workStyle: WorkStyle;
    /** What should shape the base choice — passed to LLM for tone. */
    dailyBalance: DailyBalance;
    baseAreaName: string;
    workInfrastructureSummary: string;
    dailyLifeSummary: string;
    purposeAccessSummary: string | null;
    activeRedFlags: string[];
    /** Work places (coworking + work cafes) — format: "Name (category, 500m)" */
    topWorkPlaceNames: string[];
    /**
     * Nearest cafes and food spots — for daily rhythm and walking options.
     * Format: "Name (café, 300m)" or "Name (food, 1.2km)"
     */
    topCafeAndFoodNames: string[];
    /**
     * Daily-life essentials with distances.
     * Format: "Market (grocery, 1.7km)"
     */
    dailyLifeDetails: string[];
  };
}
