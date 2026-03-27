/**
 * /api/admin/demand
 *
 * Queries PostHog for top searched cities in the last 30 days,
 * then filters out cities that are already curated.
 *
 * Required env vars (server-side only):
 *   POSTHOG_PERSONAL_API_KEY  — from PostHog → Settings → Personal API keys
 *   POSTHOG_PROJECT_ID        — numeric ID in the PostHog project URL
 *
 * Returns:
 *   { cities: [{ slug, name, count, isCurated }] }
 *   { error: "not_configured" }  — if env vars are missing
 */

import { NextRequest, NextResponse } from "next/server";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

interface PostHogRow {
  city_slug: string;
  city_name: string;
  searches: number;
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json({ error: "not_configured" }, { status: 200 });
  }

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ??
    "https://us.i.posthog.com";

  const query = `
    SELECT
      properties.city_slug AS city_slug,
      properties.city_name AS city_name,
      count() AS searches
    FROM events
    WHERE
      event = 'city_search_submitted'
      AND timestamp > now() - interval 30 day
      AND properties.city_slug IS NOT NULL
      AND properties.city_slug != ''
    GROUP BY city_slug, city_name
    ORDER BY searches DESC
    LIMIT 30
  `.trim();

  let rows: PostHogRow[] = [];
  try {
    const res = await fetch(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
        next: { revalidate: 300 }, // cache 5 min
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[demand] PostHog query failed:", res.status, text);
      return NextResponse.json(
        { error: `posthog_error:${res.status}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    // PostHog returns { results: [[col1, col2, col3], ...], columns: [...] }
    const results: unknown[][] = data.results ?? [];
    rows = results.map((row) => ({
      city_slug: String(row[0] ?? ""),
      city_name: String(row[1] ?? ""),
      searches: Number(row[2] ?? 0),
    }));
  } catch (err) {
    console.error("[demand] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }

  const curatedSlugs = new Set(Object.keys(CURATED_NEIGHBORHOODS));

  const cities = rows
    .filter((r) => r.city_slug)
    .map((r) => ({
      slug: r.city_slug,
      name: r.city_name || r.city_slug,
      searches: r.searches,
      isCurated: curatedSlugs.has(r.city_slug),
    }));

  return NextResponse.json({ cities });
}
