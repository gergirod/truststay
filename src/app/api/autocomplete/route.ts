import { NextRequest, NextResponse } from "next/server";
import { toSlug } from "@/lib/geocode";
import type { City } from "@/types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Trustay/1.0 (trustay.app; contact@trustay.app)";

const AREA_TYPES = new Set([
  "neighbourhood",
  "suburb",
  "quarter",
  "city_district",
  "residential",
]);

const NATURAL_TYPES = new Set([
  "lake", "water", "bay", "island", "river", "sea", "reservoir",
]);

export interface AutocompleteSuggestion {
  label: string;
  sublabel: string;
  typeLabel: "Neighborhood" | "District" | "City" | "Area";
  city: City;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  boundingbox?: string[];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    county?: string;
    country?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    lake?: string;
    island?: string;
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 300 },
    });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  if (!res.ok) return NextResponse.json({ suggestions: [] });

  let results: NominatimSearchResult[];
  try {
    results = await res.json();
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions: AutocompleteSuggestion[] = [];

  for (const r of results) {
    // Skip roads, streets, postal features, and administrative boundaries —
    // boundaries are technical constructs (metro areas, municipalities) that
    // users don't search for by name. Place/water/natural results are enough.
    if (
      r.class === "highway" ||
      r.class === "postal_code" ||
      r.class === "railway" ||
      r.class === "boundary" ||
      r.class === "landuse"
    ) continue;

    const address = r.address ?? {};
    const country = address.country ?? "";
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);

    const isArea = r.type ? AREA_TYPES.has(r.type) : false;
    const isNatural =
      (r.class === "water" || r.class === "natural") &&
      NATURAL_TYPES.has(r.type ?? "");

    let label: string;
    let sublabel: string;
    let typeLabel: AutocompleteSuggestion["typeLabel"];
    let bbox: [number, number, number, number] | undefined;
    let parentCity: string | undefined;

    if (isNatural) {
      label =
        address.lake ??
        address.island ??
        r.display_name.split(",")[0].trim();

      parentCity = address.county ?? address.city ?? address.town ?? undefined;
      sublabel = [parentCity, country].filter(Boolean).join(", ");
      typeLabel = "Area";

      if (r.boundingbox && r.boundingbox.length === 4) {
        const [minlat, maxlat, minlon, maxlon] = r.boundingbox.map(Number);
        // Lakes/islands can be larger — allow up to 0.8°
        if (maxlat - minlat <= 0.8 && maxlon - minlon <= 0.8) {
          bbox = [minlat, minlon, maxlat, maxlon];
        }
      }
    } else if (isArea) {
      label =
        address.neighbourhood ??
        address.suburb ??
        address.quarter ??
        address.city_district ??
        r.display_name.split(",")[0].trim();

      parentCity =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        undefined;

      sublabel = [parentCity, country].filter(Boolean).join(", ");

      typeLabel =
        r.type === "neighbourhood"
          ? "Neighborhood"
          : r.type === "city_district" || r.type === "quarter"
          ? "District"
          : "Area";

      if (r.boundingbox && r.boundingbox.length === 4) {
        const [minlat, maxlat, minlon, maxlon] = r.boundingbox.map(Number);
        if (maxlat - minlat <= 0.3 && maxlon - minlon <= 0.3) {
          bbox = [minlat, minlon, maxlat, maxlon];
        }
      }
    } else {
      label =
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        address.hamlet ??
        address.county ??
        r.display_name.split(",")[0].trim();

      sublabel = country;
      typeLabel = "City";
    }

    if (!label) continue;

    const city: City = {
      name: label,
      slug: toSlug(label),
      country,
      lat,
      lon,
      bbox,
      parentCity,
    };

    suggestions.push({ label, sublabel, typeLabel, city });

    // Deduplicate by slug
    if (suggestions.filter((s) => s.city.slug === city.slug).length > 1) {
      suggestions.pop();
    }
  }

  return NextResponse.json(
    { suggestions: suggestions.slice(0, 5) },
    {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    }
  );
}
