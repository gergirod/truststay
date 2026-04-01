import { NextRequest, NextResponse } from "next/server";
import { deriveStarlinkFallbackByLatLon } from "@/lib/connectivity/starlink";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lng") ?? req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const fallback = deriveStarlinkFallbackByLatLon(lat, lon);
  return NextResponse.json({ fallback });
}
