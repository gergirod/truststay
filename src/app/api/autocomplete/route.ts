import { NextRequest, NextResponse } from "next/server";
import { toSlug } from "@/lib/geocode";
import type { City } from "@/types";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";
const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

export interface AutocompleteSuggestion {
  label: string;
  sublabel: string;
  typeLabel: "Neighborhood" | "District" | "City" | "Area";
  city: City;
}

interface GPrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types: string[];
}

interface GAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GDetailsResult {
  result?: {
    geometry?: {
      location: { lat: number; lng: number };
      viewport?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    address_components?: GAddressComponent[];
  };
  status: string;
}

// Skip types that are too specific (streets) or too broad (countries/continents)
const SKIP_TYPES = new Set([
  "route", "street_address", "premise", "subpremise", "plus_code",
  "postal_code", "country", "continent",
]);

function getTypeLabel(types: string[]): AutocompleteSuggestion["typeLabel"] {
  if (types.some((t) => t === "neighborhood" || t.startsWith("sublocality"))) {
    return "Neighborhood";
  }
  if (types.includes("administrative_area_level_2")) {
    return "District";
  }
  if (types.some((t) => t === "natural_feature" || t === "body_of_water")) {
    return "Area";
  }
  return "City";
}

function extractCountry(components: GAddressComponent[]): string {
  return components.find((c) => c.types.includes("country"))?.long_name ?? "";
}

function extractParentCity(components: GAddressComponent[]): string | undefined {
  return (
    components.find((c) => c.types.includes("locality"))?.long_name ??
    components.find((c) => c.types.includes("postal_town"))?.long_name ??
    components.find((c) => c.types.includes("administrative_area_level_2"))?.long_name
  );
}

async function fetchPredictions(q: string): Promise<GPrediction[]> {
  const url = new URL(`${PLACES_BASE}/autocomplete/json`);
  url.searchParams.set("input", q);
  // (regions) includes localities, neighborhoods, admin areas — excludes streets
  url.searchParams.set("types", "(regions)");
  url.searchParams.set("key", GOOGLE_API_KEY);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.predictions ?? [];
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(placeId: string): Promise<GDetailsResult | null> {
  const url = new URL(`${PLACES_BASE}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "geometry,address_components");
  url.searchParams.set("key", GOOGLE_API_KEY);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2 || !GOOGLE_API_KEY) {
    return NextResponse.json({ suggestions: [] });
  }

  const predictions = await fetchPredictions(q);
  if (!predictions.length) {
    return NextResponse.json({ suggestions: [] });
  }

  // Filter and slice before fetching details to save quota
  const usable = predictions
    .filter((p) => !p.types.some((t) => SKIP_TYPES.has(t)))
    .slice(0, 5);

  // Parallel fetch place details (coords + address components)
  const detailsList = await Promise.all(usable.map((p) => fetchPlaceDetails(p.place_id)));

  const suggestions: AutocompleteSuggestion[] = [];
  const seenSlugs = new Set<string>();

  for (let i = 0; i < usable.length; i++) {
    const prediction = usable[i];
    const details = detailsList[i];
    if (!details?.result?.geometry?.location) continue;

    const { lat, lng } = details.result.geometry.location;
    const components = details.result.address_components ?? [];
    const typeLabel = getTypeLabel(prediction.types);
    const country = extractCountry(components);
    const parentCity = typeLabel !== "City" ? extractParentCity(components) : undefined;
    const mainText = prediction.structured_formatting.main_text;
    const secondaryText = prediction.structured_formatting.secondary_text ?? "";

    // Build bbox for neighborhoods/areas from viewport
    let bbox: [number, number, number, number] | undefined;
    const vp = details.result.geometry.viewport;
    if (vp && typeLabel !== "City") {
      bbox = [vp.southwest.lat, vp.southwest.lng, vp.northeast.lat, vp.northeast.lng];
    }

    const slug = toSlug(mainText);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    suggestions.push({
      label: mainText,
      sublabel: secondaryText,
      typeLabel,
      city: { name: mainText, slug, country, lat, lon: lng, bbox, parentCity },
    });
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, 5) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
