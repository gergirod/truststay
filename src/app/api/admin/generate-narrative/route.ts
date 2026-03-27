import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/geocode";
import { fetchPlaces, sortByDistance, haversineKm } from "@/lib/overpass";
import { computeBaseCentroid, computeCitySummary } from "@/lib/scoring";
import { reverseGeocodeArea } from "@/lib/geocode";
import { generateNarrativeOptions } from "@/lib/narrativeAI";
import { getPlaceConfirmations } from "@/lib/confirmations";
import type { Place } from "@/types";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "openai_not_configured" }, { status: 200 });
  }

  let body: { citySlug: string; cityName: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { citySlug, cityName } = body;
  if (!citySlug || !cityName) {
    return NextResponse.json({ error: "Missing citySlug or cityName" }, { status: 400 });
  }

  // 1. Geocode the city
  const city = await geocodeCity(citySlug);
  if (!city) {
    return NextResponse.json({ error: "city_not_found" }, { status: 200 });
  }

  // 2. Fetch places from Overpass
  let allPlaces: Place[];
  try {
    allPlaces = await fetchPlaces(city);
  } catch {
    return NextResponse.json({ error: "overpass_failed" }, { status: 200 });
  }

  // 3. Compute base centroid + distances
  const baseCentroid = computeBaseCentroid(allPlaces, city.lat, city.lon);
  const places: Place[] = baseCentroid
    ? allPlaces.map((p) => ({
        ...p,
        distanceFromBasekm:
          Math.round(haversineKm(baseCentroid.lat, baseCentroid.lon, p.lat, p.lon) * 10) / 10,
      }))
    : allPlaces;

  // 4. Compute routine score
  const summary = computeCitySummary(city, places);

  // 5. Reverse geocode base centroid
  const baseCentroidAddress = baseCentroid
    ? await reverseGeocodeArea(baseCentroid.lat, baseCentroid.lon).catch(() => null)
    : null;

  // 6. Get user confirmation signals from PostHog
  const confirmations = await getPlaceConfirmations(citySlug).catch(() => new Map());

  // 7. Build place lists for the prompt
  const workPlaces = [
    ...places.filter((p) => p.category === "coworking"),
    ...places.filter((p) => p.category === "cafe"),
  ]
    .sort((a, b) => (a.distanceFromBasekm ?? 99) - (b.distanceFromBasekm ?? 99))
    .slice(0, 8);

  const cafePlaces = places
    .filter((p) => p.category === "food")
    .sort((a, b) => (a.distanceFromBasekm ?? 99) - (b.distanceFromBasekm ?? 99))
    .slice(0, 8);

  // 8. Build confirmed/reported place signals
  const confirmedPlaces: { name: string; confirmCount: number }[] = [];
  const reportedPlaces: { name: string; issue: string }[] = [];

  for (const place of places) {
    const cd = confirmations.get(place.id);
    if (!cd) continue;
    if (cd.confirmCount >= 1) {
      confirmedPlaces.push({ name: place.name, confirmCount: cd.confirmCount });
    }
    if (cd.reportCount >= 2) {
      reportedPlaces.push({ name: place.name, issue: "multiple users reported an issue" });
    }
  }

  // 9. Call OpenAI
  const options = await generateNarrativeOptions({
    cityName: city.name,
    citySlug,
    country: city.country,
    routineScore: summary.routineScore,
    workPlaces,
    cafePlaces,
    totalPlaces: places.length,
    baseCentroidAddress,
    confirmedPlaces: confirmedPlaces.length ? confirmedPlaces : undefined,
    reportedPlaces: reportedPlaces.length ? reportedPlaces : undefined,
  });

  if (!options) {
    return NextResponse.json({ error: "llm_failed" }, { status: 200 });
  }

  return NextResponse.json({
    options,
    meta: {
      routineScore: summary.routineScore,
      totalPlaces: places.length,
      baseCentroidAddress,
      confirmedCount: confirmedPlaces.length,
    },
  });
}
