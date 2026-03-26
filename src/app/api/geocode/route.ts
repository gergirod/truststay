import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { ok: false, error: "Missing query parameter: q" },
      { status: 400 }
    );
  }

  let city;
  try {
    city = await geocodeCity(q);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geocoding service unavailable" },
      { status: 502 }
    );
  }

  if (!city) {
    return NextResponse.json(
      { ok: false, error: "City not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { ok: true, city },
    {
      headers: {
        // Allow CDN/browser to cache identical queries for 10 minutes
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}
