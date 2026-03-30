import { z } from "zod";

const score0to10 = z.number().min(0).max(10);

export const WorkVenueSchema = z.object({
  name: z.string(),
  category: z.enum(["coworking", "cafe", "coliving"]),
  distance_km: z.number(),
  rating: z.number().optional(),
  reviews_count: z.number().int().optional(),
  confirmed_wifi: z.boolean(),
  pricing: z.string().optional(),
  opening_hours: z.array(z.string()).optional(),
  notable_review: z.string().optional(),
});

export const WorkEvidenceSchema = z.object({
  coworkings: z.array(WorkVenueSchema),
  work_cafes: z.array(WorkVenueSchema),
  has_coliving_with_workspace: z.boolean(),
  coliving_name: z.string().optional(),
  coliving_price_per_night: z.number().optional(),
  best_wifi_confirmed: z.boolean(),
  wifi_review_mentions: z.array(z.string()),
  internet_score_estimate: score0to10,
});

export const ActivitySpotSchema = z.object({
  name: z.string(),
  distance_km: z.number(),
  walkable: z.boolean(),
  rating: z.number().optional(),
});

export const ActivityVenueSchema = z.object({
  name: z.string(),
  type: z.string(),
  distance_km: z.number(),
  pricing: z.string().optional(),
  rating: z.number().optional(),
});

export const ActivityEvidenceSchema = z.object({
  main_spot_distance_km: z.number().nullable(),
  main_spot_name: z.string().optional(),
  main_spot_walkable: z.boolean(),
  additional_spots: z.array(ActivitySpotSchema),
  schools_or_rentals: z.array(ActivityVenueSchema),
  seasonal_note: z.string().optional(),
  activity_score_estimate: score0to10,
});

export const GymEvidenceSchema = z.object({
  found: z.boolean(),
  name: z.string().optional(),
  distance_km: z.number().optional(),
  rating: z.number().optional(),
});

export const RoutineEvidenceSchema = z.object({
  gym: GymEvidenceSchema.nullable(),
  grocery: z.object({
    found: z.boolean(),
    name: z.string().optional(),
    distance_km: z.number().optional(),
    walkable: z.boolean(),
  }).nullable(),
  pharmacy: z.object({
    found: z.boolean(),
    name: z.string().optional(),
    distance_km: z.number().optional(),
  }).nullable(),
  laundry: z.object({ found: z.boolean(), distance_km: z.number().optional() }).nullable(),
  routine_score_estimate: score0to10,
});

export const FrictionEvidenceSchema = z.object({
  work_spot_walkable: z.boolean(),
  activity_walkable: z.boolean(),
  grocery_walkable: z.boolean(),
  requires_scooter_for_daily_life: z.boolean(),
  requires_car_for_any_essential: z.boolean(),
  typical_daily_friction_note: z.string(),
  friction_score_estimate: score0to10,
});

export const AccommodationOptionSchema = z.object({
  name: z.string(),
  type: z.enum(["coliving", "hostel", "airbnb", "hotel", "guesthouse"]),
  price_per_night: z.number().optional(),
  has_workspace: z.boolean(),
  has_fast_wifi: z.boolean(),
  distance_to_activity_km: z.number().optional(),
  rating: z.number().optional(),
  notable_review: z.string().optional(),
});

export const AccommodationEvidenceSchema = z.object({
  options: z.array(AccommodationOptionSchema),
  has_coliving: z.boolean(),
  price_range_per_night: z.object({ min: z.number(), max: z.number() }).nullable(),
  best_for_work_option: z.string().optional(),
});

export const FoodEvidenceSchema = z.object({
  cafes: z.array(z.object({
    name: z.string(),
    distance_km: z.number(),
    laptop_friendly: z.boolean(),
    rating: z.number().optional(),
    opens_at: z.string().optional(),
  })),
  restaurants: z.array(z.object({
    name: z.string(),
    distance_km: z.number(),
    rating: z.number().optional(),
  })),
  food_score_estimate: score0to10,
});

export const SleepEvidenceSchema = z.object({
  noise_signals: z.array(z.string()),
  sleep_score_estimate: score0to10,
  note: z.string().optional(),
});

export const BudgetEvidenceSchema = z.object({
  avg_accommodation_per_night: z.number().nullable(),
  avg_meal_cost: z.number().nullable(),
  budget_score_estimate: score0to10,
  note: z.string().optional(),
});

export const VibeEvidenceSchema = z.object({
  crowd_type: z.string().optional(),
  vibe_tags: z.array(z.string()),
  vibe_score_estimate: score0to10,
});

export const EvidenceConfidenceSchema = z.enum(["high", "medium", "low"]);

export const EvidencePackSchema = z.object({
  micro_area_id: z.string(),
  collected_at: z.string(),
  confidence: EvidenceConfidenceSchema,
  work: WorkEvidenceSchema,
  activity: ActivityEvidenceSchema,
  routine: RoutineEvidenceSchema,
  friction: FrictionEvidenceSchema,
  accommodation: AccommodationEvidenceSchema,
  food: FoodEvidenceSchema,
  sleep: SleepEvidenceSchema,
  budget: BudgetEvidenceSchema,
  vibe: VibeEvidenceSchema,
});

export type EvidencePack = z.infer<typeof EvidencePackSchema>;
export type WorkEvidence = z.infer<typeof WorkEvidenceSchema>;
export type ActivityEvidence = z.infer<typeof ActivityEvidenceSchema>;
export type RoutineEvidence = z.infer<typeof RoutineEvidenceSchema>;
export type FrictionEvidence = z.infer<typeof FrictionEvidenceSchema>;
export type AccommodationEvidence = z.infer<typeof AccommodationEvidenceSchema>;
export type FoodEvidence = z.infer<typeof FoodEvidenceSchema>;
export type SleepEvidence = z.infer<typeof SleepEvidenceSchema>;
export type BudgetEvidence = z.infer<typeof BudgetEvidenceSchema>;
export type VibeEvidence = z.infer<typeof VibeEvidenceSchema>;
export type WorkVenue = z.infer<typeof WorkVenueSchema>;
export type AccommodationOption = z.infer<typeof AccommodationOptionSchema>;
