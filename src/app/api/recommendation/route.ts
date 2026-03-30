import { NextRequest, NextResponse } from "next/server";
import { buildFinalResponse } from "@/application/use-cases/buildFinalResponse";
import { UserProfileSchema } from "@/schemas/zod/userProfile.schema";
import type { StayPurpose, WorkMode, DailyBalance } from "@/schemas/zod/userProfile.schema";
import { z } from "zod";

const RequestSchema = z.object({
  citySlug: z.string(),
  cityName: z.string(),
  country: z.string(),
  purpose: z.enum(["surf", "dive", "hike", "yoga", "kite", "work_first", "exploring"]),
  workStyle: z.enum(["light", "balanced", "heavy"]),
  dailyBalance: z.enum(["purpose_first", "balanced", "work_first"]).optional().default("balanced"),
  durationDays: z.number().int().positive().optional(),
  routineNeeds: z.array(z.enum(["gym", "grocery_walkable", "pharmacy_nearby", "laptop_cafe", "laundry"])).optional().default([]),
  budgetLevel: z.enum(["budget", "mid_range", "premium"]).nullable().optional().default(null),
  vibe: z.enum(["social", "local", "quiet"]).nullable().optional().default(null),
  transport: z.enum(["walking", "scooter", "car", "unknown"]).optional().default("unknown"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const userProfile = UserProfileSchema.parse({
      destination: `${d.cityName}, ${d.country}`,
      duration_days: d.durationDays ?? null,
      main_activity: d.purpose as StayPurpose,
      work_mode: d.workStyle as WorkMode,
      daily_balance: d.dailyBalance as DailyBalance,
      routine_needs: d.routineNeeds,
      budget_level: d.budgetLevel,
      preferred_vibe: d.vibe,
      transport_assumption: d.transport,
      hard_constraints: [],
    });

    const output = await buildFinalResponse({
      citySlug: d.citySlug,
      cityName: d.cityName,
      country: d.country,
      userProfile,
    });

    return NextResponse.json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "ENGINE_ERROR", details: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const citySlug = searchParams.get("citySlug") ?? "popoyo";
  const cityName = searchParams.get("cityName") ?? "Popoyo";
  const country = searchParams.get("country") ?? "Nicaragua";
  const purpose = (searchParams.get("purpose") ?? "surf") as StayPurpose;
  const workStyle = (searchParams.get("workStyle") ?? "balanced") as WorkMode;
  const dailyBalance = (searchParams.get("dailyBalance") ?? "balanced") as DailyBalance;
  const gym = searchParams.get("gym") === "true";

  const userProfile = UserProfileSchema.parse({
    destination: `${cityName}, ${country}`,
    duration_days: null,
    main_activity: purpose,
    work_mode: workStyle,
    daily_balance: dailyBalance,
    routine_needs: gym ? ["gym"] : [],
    budget_level: null,
    preferred_vibe: null,
    transport_assumption: "unknown",
    hard_constraints: [],
  });

  try {
    const output = await buildFinalResponse({
      citySlug,
      cityName,
      country,
      userProfile,
    });

    return NextResponse.json(output, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "ENGINE_ERROR", details: message }, { status: 500 });
  }
}
