import { NextRequest, NextResponse } from "next/server";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
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
      properties.name           AS name,
      properties.mapsUrl        AS maps_url,
      properties.category       AS category,
      properties.note           AS note,
      properties.citySlug       AS city_slug,
      properties.neighborhoodSlug AS neighborhood_slug,
      timestamp                 AS submitted_at
    FROM events
    WHERE
      event = 'place_suggested'
      AND timestamp > now() - interval 90 day
    ORDER BY timestamp DESC
    LIMIT 100
  `.trim();

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[admin/suggestions] PostHog query failed:", res.status, text);
      return NextResponse.json({ error: `posthog_error:${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    const results: unknown[][] = data.results ?? [];

    const suggestions = results.map((row) => ({
      name:             String(row[0] ?? ""),
      mapsUrl:          String(row[1] ?? ""),
      category:         String(row[2] ?? ""),
      note:             row[3] ? String(row[3]) : null,
      citySlug:         String(row[4] ?? ""),
      neighborhoodSlug: String(row[5] ?? ""),
      submittedAt:      String(row[6] ?? ""),
    }));

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[admin/suggestions] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }
}
