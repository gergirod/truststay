export interface City {
  name: string;
  slug: string;
  country: string;
  lat: number;
  lon: number;
}

export interface CitySummary {
  routineScore: number;
  summaryText: string;
  recommendedArea: string;
  confidence: "low" | "medium" | "high";
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

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  rating?: number;
  reviewCount?: number;
  distanceKm?: number;
  confidence: PlaceConfidence;
  bestFor: BestForTag[];
  explanation: string;
}

export type CheckoutProduct = "city_pass" | "trustay_pass";
