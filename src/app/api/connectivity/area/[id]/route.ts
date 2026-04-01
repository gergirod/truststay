import { NextRequest, NextResponse } from "next/server";
import { connectivityRepository } from "@/db/repositories";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const citySlug = req.nextUrl.searchParams.get("citySlug")?.trim();
  const force = req.nextUrl.searchParams.get("force") === "1";
  const { id } = await params;
  if (!citySlug) {
    return NextResponse.json({ error: "citySlug is required" }, { status: 400 });
  }

  await ensureConnectivityPrecomputedForCitySlug(citySlug, {
    forceRecompute: force,
  });
  const destination = await connectivityRepository.getDestinationBySlug(citySlug);
  if (!destination) return NextResponse.json({ profile: null });

  const profile = await connectivityRepository.getAreaProfile(destination.id, id);
  return NextResponse.json({
    profile: profile
      ? {
          area_id: profile.areaId,
          best_cell_id: profile.bestCellId,
          summary: profile.summary,
          starlink_fallback: profile.starlinkFallback,
          computed_at: profile.computedAt?.toISOString?.() ?? null,
        }
      : null,
  });
}
