import { NextRequest, NextResponse } from "next/server";
import { canonicalRepository } from "@/db/repositories";

function isAuthorized(req: NextRequest): boolean {
  const secretFromQuery = req.nextUrl.searchParams.get("secret") ?? "";
  const secretFromHeader = req.headers.get("x-admin-secret") ?? "";
  const expected = process.env.ADMIN_SECRET ?? "";
  if (!expected) return false;
  return secretFromQuery === expected || secretFromHeader === expected;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json(
      { error: "Missing required query param: slug" },
      { status: 400 },
    );
  }

  const [context, jobs] = await Promise.all([
    canonicalRepository.getCanonicalDestinationContext(slug),
    canonicalRepository.listRecentRefreshJobs(50),
  ]);

  if (!context) {
    return NextResponse.json(
      { error: `No canonical context for slug "${slug}"` },
      { status: 404 },
    );
  }

  const relatedJobs = jobs.filter(
    (j) =>
      j.metadata &&
      typeof j.metadata === "object" &&
      "citySlug" in j.metadata &&
      (j.metadata as { citySlug?: string }).citySlug === slug,
  );

  return NextResponse.json({
    destination: context.destination,
    microAreas: context.microAreas.map((m) => ({
      id: m.area.id,
      name: m.area.canonicalName,
      center: { lat: m.area.centerLat, lon: m.area.centerLon },
      radius_km: m.area.radiusKm,
      status: m.area.status,
      confidence: m.area.confidence,
      aliases: m.aliases.map((a) => a.aliasName),
      lastVerifiedAt: m.area.lastVerifiedAt,
    })),
    placeFreshness: context.placeFreshness,
    refreshJobs: relatedJobs,
  });
}

