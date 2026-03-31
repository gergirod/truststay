import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { destinations } from "@/db/schema";
import { listCanonicalDestinationMetas } from "@/data/activityDestinations";

function pickRandom<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { examples: ["Puerto Escondido", "Santa Teresa", "Popoyo"] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const activitySlugs = listCanonicalDestinationMetas().map((d) => d.slug);
  if (!activitySlugs.length) {
    return NextResponse.json(
      { examples: ["Puerto Escondido", "Santa Teresa", "Popoyo"] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await db
    .select({ name: destinations.name })
    .from(destinations)
    .where(inArray(destinations.slug, activitySlugs));

  const names = Array.from(new Set(rows.map((r) => r.name).filter(Boolean)));
  const examples = pickRandom(names, 3);

  return NextResponse.json(
    {
      examples: examples.length
        ? examples
        : ["Puerto Escondido", "Santa Teresa", "Popoyo"],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

