import { z } from "zod";

const score0to10 = z.number().min(0).max(10);
const score0to1 = z.number().min(0).max(1);

export const DimensionScoresSchema = z.object({
  activity_access: score0to10,
  internet_reliability: score0to10,
  work_environment: score0to10,
  routine_support: score0to10,
  walkability_and_friction: score0to10,
  food_and_coffee: score0to10,
  sleep_noise_comfort: score0to10,
  budget_value: score0to10,
  vibe_match: score0to10,
  weighted_total: score0to10,
});

export const PenaltySchema = z.object({
  id: z.string(),
  reason: z.string(),
  value: z.number().min(0),
  is_hard: z.boolean(),
  dimension: z.string(),
});

export const ScoreCardSchema = z.object({
  micro_area_id: z.string(),
  micro_area_name: z.string(),
  scores: DimensionScoresSchema,
  penalties: z.array(PenaltySchema),
  final_score: score0to10,
  confidence: score0to1,
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  constraint_breakers: z.array(z.string()),
  best_for: z.array(z.string()),
});

export const MicroAreaOutputSchema = z.object({
  name: z.string(),
  summary: z.string(),
  scores: DimensionScoresSchema,
  penalties: z.array(z.object({ reason: z.string(), value: z.number() })),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  constraint_breakers: z.array(z.string()),
  best_for: z.array(z.string()),
  confidence: score0to1,
  // Spatial data — populated when coordinates are known (dynamic discovery or fixtures)
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  radius_km: z.number().optional(),
});

export type ScoreCard = z.infer<typeof ScoreCardSchema>;
export type Penalty = z.infer<typeof PenaltySchema>;
export type DimensionScores = z.infer<typeof DimensionScoresSchema>;
export type MicroAreaOutput = z.infer<typeof MicroAreaOutputSchema>;
export type { MicroAreaOutput as MicroAreaOutputType };
