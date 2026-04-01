import { NextRequest, NextResponse } from "next/server";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";
import { getDestinationSlugsForActivity } from "@/data/activityDestinations";

function isAuthorized(req: NextRequest, bodySecret?: string): boolean {
  const secretFromQuery = req.nextUrl.searchParams.get("secret") ?? "";
  const secretFromHeader = req.headers.get("x-admin-secret") ?? "";
  const expected = process.env.ADMIN_SECRET ?? "";
  if (!expected) return false;
  return (
    secretFromQuery === expected ||
    secretFromHeader === expected ||
    bodySecret === expected
  );
}

type Activity =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first"
  | "exploring"
  | "all";

export async function POST(req: NextRequest) {
  let body: {
    secret?: string;
    citySlug?: string;
    activity?: Activity;
    limit?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isAuthorized(req, body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const citySlug = body.citySlug?.trim();
  const activity = body.activity ?? "all";
  const limit = Number(body.limit ?? 0);
  const slugs = citySlug
    ? [citySlug]
    : getDestinationSlugsForActivity(activity === "all" ? "all" : activity);
  const uniqueSlugs = [...new Set(slugs)];
  const targetSlugs =
    Number.isFinite(limit) && limit > 0
      ? uniqueSlugs.slice(0, Math.floor(limit))
      : uniqueSlugs;

  const results: Array<{ citySlug: string; ok: boolean; cellCount: number }> = [];
  for (const slug of targetSlugs) {
    const result = await ensureConnectivityPrecomputedForCitySlug(slug, {
      forceRecompute: true,
    }).catch(() => ({ ok: false, cellCount: 0 }));
    results.push({ citySlug: slug, ok: result.ok, cellCount: result.cellCount });
  }

  return NextResponse.json({
    ok: true,
    total: targetSlugs.length,
    recomputed: results.filter((r) => r.ok).length,
    results,
  });
}
