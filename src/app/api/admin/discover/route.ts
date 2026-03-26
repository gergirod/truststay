import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/lib/geocode";
import { discoverNeighborhoods } from "@/lib/neighborhoodDiscovery";
import { fetchPlaces, haversineKm } from "@/lib/overpass";
import { enrichPlaces } from "@/lib/enrichment";
import type { NeighborhoodEntry } from "@/data/neighborhoods";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

/** Quality signals for a neighborhood, derived from real place data */
interface NeighborhoodQuality {
  avgGoogleRating: number | null;
  enrichedPlaceCount: number;
  totalPlaceCount: number;
  hasCoworking: boolean;
  openingHoursCount: number;
}

function computeNeighbourhoodQuality(
  n: NeighborhoodEntry,
  places: Awaited<ReturnType<typeof enrichPlaces>>
): NeighborhoodQuality {
  const RADIUS_KM = 0.7;
  const nearby = places.filter(
    (p) => haversineKm(n.lat, n.lon, p.lat, p.lon) < RADIUS_KM
  );

  const enriched = nearby.filter((p) => p.google?.rating !== undefined);
  const ratings = enriched.map((p) => p.google!.rating!).filter((r) => r > 0);
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const withHours = nearby.filter(
    (p) => p.google?.openingHours !== undefined
  );

  return {
    avgGoogleRating: avgRating,
    enrichedPlaceCount: enriched.length,
    totalPlaceCount: nearby.length,
    hasCoworking: nearby.some((p) => p.category === "coworking"),
    openingHoursCount: withHours.length,
  };
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing ?q= param" }, { status: 400 });
  }

  // 1. Geocode the city
  const city = await geocodeCity(query);
  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // 2. Auto-discover neighborhoods + fetch enriched places in parallel
  const [neighborhoods, rawPlaces] = await Promise.all([
    discoverNeighborhoods(city),
    fetchPlaces(city).catch(() => []),
  ]);

  // 3. Enrich places with Google data (gives us ratings)
  const places = await enrichPlaces(rawPlaces, city.lat, city.lon).catch(
    () => rawPlaces
  );

  // 4. City-wide place counts
  const placeCounts = {
    cafes: places.filter((p) => p.category === "cafe").length,
    coworkings: places.filter((p) => p.category === "coworking").length,
    gyms: places.filter((p) => p.category === "gym").length,
    food: places.filter((p) => p.category === "food").length,
    total: places.length,
    enriched: places.filter((p) => p.google !== undefined).length,
  };

  // 5. Attach quality signals to each neighborhood
  const neighborhoodsWithQuality = neighborhoods.map((n) => ({
    ...n,
    quality: computeNeighbourhoodQuality(n, places),
  }));

  return NextResponse.json({
    city: {
      name: city.name,
      slug: city.slug,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
    },
    placeCounts,
    neighborhoods: neighborhoodsWithQuality,
  });
}
