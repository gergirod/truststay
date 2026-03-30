import { z } from "zod";

const weightValue = z.number().min(0).max(1);

export const DecisionWeightsSchema = z
  .object({
    activity_access: weightValue,
    internet_reliability: weightValue,
    work_environment: weightValue,
    routine_support: weightValue,
    walkability_and_friction: weightValue,
    food_and_coffee: weightValue,
    sleep_noise_comfort: weightValue,
    budget_value: weightValue,
    vibe_match: weightValue,
  })
  .refine(
    (w) => {
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      return Math.abs(sum - 1.0) < 0.01;
    },
    { message: "DecisionWeights must sum to 1.0 (±0.01)" }
  );

export type DecisionWeights = z.infer<typeof DecisionWeightsSchema>;
export type DimensionKey = keyof DecisionWeights;

export const DEFAULT_WEIGHTS: DecisionWeights = {
  activity_access: 0.22,
  internet_reliability: 0.20,
  work_environment: 0.14,
  routine_support: 0.14,
  walkability_and_friction: 0.10,
  food_and_coffee: 0.08,
  sleep_noise_comfort: 0.05,
  budget_value: 0.04,
  vibe_match: 0.03,
};
