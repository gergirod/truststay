import { z } from "zod";

export const StayPurposeSchema = z.enum([
  "surf", "dive", "hike", "yoga", "kite", "work_first", "exploring",
]);

export const WorkModeSchema = z.enum(["light", "balanced", "heavy"]);

export const DailyBalanceSchema = z.enum(["purpose_first", "balanced", "work_first"]);

export const RoutineNeedSchema = z.enum([
  "gym", "grocery_walkable", "pharmacy_nearby", "laptop_cafe", "laundry",
]);

export const BudgetLevelSchema = z.enum(["budget", "mid_range", "premium"]).nullable();

export const VibePreferenceSchema = z.enum(["social", "local", "quiet"]).nullable();

export const TransportAssumptionSchema = z.enum(["walking", "scooter", "car", "unknown"]);

export const UserProfileSchema = z.object({
  destination: z.string().min(1),
  duration_days: z.number().int().positive().nullable(),
  main_activity: StayPurposeSchema,
  work_mode: WorkModeSchema,
  daily_balance: DailyBalanceSchema,
  routine_needs: z.array(RoutineNeedSchema),
  budget_level: BudgetLevelSchema,
  preferred_vibe: VibePreferenceSchema,
  transport_assumption: TransportAssumptionSchema,
  hard_constraints: z.array(z.string()),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type StayPurpose = z.infer<typeof StayPurposeSchema>;
export type WorkMode = z.infer<typeof WorkModeSchema>;
export type DailyBalance = z.infer<typeof DailyBalanceSchema>;
export type RoutineNeed = z.infer<typeof RoutineNeedSchema>;
export type BudgetLevel = z.infer<typeof BudgetLevelSchema>;
export type VibePreference = z.infer<typeof VibePreferenceSchema>;
export type TransportAssumption = z.infer<typeof TransportAssumptionSchema>;
