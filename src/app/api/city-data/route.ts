import { NextRequest, NextResponse } from "next/server";
import { fetchPlaces, sortByDistance } from "@/lib/overpass";
import { computeCitySummary } from "@/lib/scoring";
import type { City } from "@/types";

const LIMITS = {
  workSpots: 20,
  coworkings: 10,
  gyms: 10,
  foodSpots: 20,
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug")?.trim();
  const lat = parseFloat(sp.get("lat") ?? "");
  const lon = parseFloat(sp.get("lon") ?? "");
  const name = sp.get("name")?.trim() ?? slug ?? "";
  const country = sp.get("country")?.trim() ?? "";

  if (!slug || isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { ok: false, error: "Missing required params: slug, lat, lon" },
      { status: 400 }
    );
  }

  const city: City = { name, slug, country, lat, lon };
  const allPlaces = await fetchPlaces(city);
  const summary = computeCitySummary(city, allPlaces);

  const workSpots = sortByDistance(
    allPlaces.filter((p) => p.category === "cafe")
  ).slice(0, LIMITS.workSpots);

  const coworkings = sortByDistance(
    allPlaces.filter((p) => p.category === "coworking")
  ).slice(0, LIMITS.coworkings);

  const gyms = sortByDistance(
    allPlaces.filter((p) => p.category === "gym")
  ).slice(0, LIMITS.gyms);

  const foodSpots = sortByDistance(
    allPlaces.filter((p) => p.category === "food")
  ).slice(0, LIMITS.foodSpots);

  return NextResponse.json(
    {
      ok: true,
      city,
      summary,
      sections: { workSpots, coworkings, gyms, foodSpots },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    }
  );
}
