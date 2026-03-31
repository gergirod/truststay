import { NextRequest, NextResponse } from "next/server";
import { asc, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { destinations } from "@/db/schema";
import type { City } from "@/types";

export interface AutocompleteSuggestion {
  label: string;
  sublabel: string;
  typeLabel: "Neighborhood" | "District" | "City" | "Area";
  city: City;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ suggestions: [] });
  }

  const query = `%${q}%`;
  const rows = await db
    .select({
      slug: destinations.slug,
      name: destinations.name,
      country: destinations.country,
      anchorLat: destinations.anchorLat,
      anchorLon: destinations.anchorLon,
    })
    .from(destinations)
    .where(
      or(
        ilike(destinations.name, query),
        ilike(destinations.slug, query),
        ilike(destinations.country, query),
      ),
    )
    .orderBy(asc(destinations.name))
    .limit(5);

  const suggestions: AutocompleteSuggestion[] = rows
    .filter((row) => row.anchorLat != null && row.anchorLon != null)
    .map((row) => ({
      label: row.name,
      sublabel: row.country,
      typeLabel: "City",
      city: {
        name: row.name,
        slug: row.slug,
        country: row.country,
        lat: row.anchorLat as number,
        lon: row.anchorLon as number,
      },
    }));

  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
