import type { BestForTag } from "@/types";

/** Suggestion categories — maps to PlaceCategory on display */
export type OverrideCategory = "work" | "food" | "wellbeing";

export interface PlaceOverride {
  citySlug: string;
  /** Neighborhood slug — use "*" to apply to any neighborhood in the city */
  neighborhoodSlug: string;
  category: OverrideCategory;
  name: string;
  lat: number;
  lon: number;
  note: string;
  mapsUrl: string;
  bestFor?: BestForTag[];
}

/**
 * Manually approved community suggestions.
 * Each entry is merged into the place list for the matching city/neighborhood.
 * Add entries here after reviewing a suggestion in the admin panel.
 *
 * Example:
 * {
 *   citySlug: "medellin-el-poblado",
 *   neighborhoodSlug: "*",
 *   category: "coworking",
 *   name: "Co-Space Poblado",
 *   lat: 6.2086,
 *   lon: -75.5659,
 *   note: "Great views, fast fiber, standing desks, 24/7 access.",
 *   mapsUrl: "https://maps.app.goo.gl/example",
 *   bestFor: ["deep_work", "calls"],
 * },
 */
export const PLACE_OVERRIDES: PlaceOverride[] = [];
