import { NextRequest, NextResponse } from "next/server";
import { geocodeCity, toSlug } from "@/lib/geocode";
import { discoverNeighborhoods } from "@/lib/neighborhoodDiscovery";
import { fetchPlaces, haversineKm } from "@/lib/overpass";
import { enrichPlaces } from "@/lib/enrichment";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";
import type { NeighborhoodEntry } from "@/data/neighborhoods";

// ── Quality thresholds ────────────────────────────────────────────────────────
// A city passes auto-curation quality if it clears at least 4 of 5 checks.
// These ensure we don't surface empty or near-empty city pages.

interface QualityReason {
  pass: boolean;
  label: string;
}

interface QualityCheck {
  passes: boolean;
  score: number; // 0–100
  reasons: QualityReason[];
}

function checkQuality(
  placeCounts: { cafes: number; coworkings: number; gyms: number; food: number; total: number },
  neighborhoodCount: number
): QualityCheck {
  const reasons: QualityReason[] = [
    {
      pass: placeCounts.total >= 6,
      label: `Total places ≥ 6 (found ${placeCounts.total})`,
    },
    {
      pass: placeCounts.coworkings >= 1 || placeCounts.cafes >= 3,
      label: `Work spots — coworkings: ${placeCounts.coworkings}, cafes: ${placeCounts.cafes}`,
    },
    {
      pass: placeCounts.gyms >= 1,
      label: `Wellbeing spots ≥ 1 (found ${placeCounts.gyms})`,
    },
    {
      pass: placeCounts.food >= 1,
      label: `Food/restaurants ≥ 1 (found ${placeCounts.food})`,
    },
    {
      pass: neighborhoodCount >= 2,
      label: `Neighborhoods discovered ≥ 2 (found ${neighborhoodCount})`,
    },
  ];

  const passed = reasons.filter((r) => r.pass).length;
  return {
    passes: passed >= 4,
    score: Math.round((passed / reasons.length) * 100),
    reasons,
  };
}

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

  // 2. Check if already curated — use curated data as base, still enrich with quality signals
  const citySlug = toSlug(city.name);
  const existingCurated = CURATED_NEIGHBORHOODS[citySlug];
  const source: "curated" | "auto-discovered" = existingCurated
    ? "curated"
    : "auto-discovered";

  // 3. Discover or use curated neighborhoods + fetch enriched places in parallel
  const [neighborhoods, rawPlaces] = await Promise.all([
    existingCurated
      ? Promise.resolve(existingCurated.neighborhoods)
      : discoverNeighborhoods(city),
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

  const qualityCheck = checkQuality(placeCounts, neighborhoods.length);

  return NextResponse.json({
    city: {
      name: city.name,
      slug: citySlug,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
    },
    source,
    placeCounts,
    neighborhoods: neighborhoodsWithQuality,
    qualityCheck,
  });
}
