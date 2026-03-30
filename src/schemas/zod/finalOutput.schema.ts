import { z } from "zod";
import { UserProfileSchema } from "./userProfile.schema";
import { DecisionWeightsSchema } from "./decisionWeights.schema";
import { MicroAreaOutputSchema } from "./scoreCard.schema";
export type { MicroAreaOutput } from "./scoreCard.schema";

const score0to10 = z.number().min(0).max(10);

export const AlternativeSchema = z.object({
  name: z.string(),
  best_for: z.string(),
  tradeoff: z.string(),
});

export const RecommendationSchema = z.object({
  top_pick: z.string(),
  why_it_wins: z.array(z.string()),
  main_tradeoffs: z.array(z.string()),
  alternatives: z.array(AlternativeSchema),
  warnings: z.array(z.string()),
  what_would_change_the_ranking: z.array(z.string()),
});

export const RankingEntrySchema = z.object({
  rank: z.number().int().min(1),
  micro_area: z.string(),
  final_score: score0to10,
  has_constraint_breakers: z.boolean().optional(),
});

export const FinalOutputSchema = z.object({
  user_profile: UserProfileSchema,
  weights: DecisionWeightsSchema,
  candidate_micro_areas: z.array(MicroAreaOutputSchema).min(1),
  ranking: z.array(RankingEntrySchema).min(1),
  recommendation: RecommendationSchema,
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
});

/** Minimal shape the BestBaseCard narrative needs — maps from FinalOutput */
export const NarrativeTextSchema = z.object({
  whyItFits: z.string(),
  dailyRhythm: z.string(),
  walkingOptions: z.string(),
  planAround: z.string(),
  logistics: z.string(),
});

export type FinalOutput = z.infer<typeof FinalOutputSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RankingEntry = z.infer<typeof RankingEntrySchema>;
export type NarrativeText = z.infer<typeof NarrativeTextSchema>;
