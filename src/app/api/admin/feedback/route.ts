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
      properties.placeId       AS place_id,
      properties.placeName     AS place_name,
      properties.citySlug      AS city_slug,
      properties.type          AS type,
      properties.issue         AS issue,
      count()                  AS count,
      max(timestamp)           AS last_at
    FROM events
    WHERE
      event = 'place_feedback'
      AND timestamp > now() - interval 90 day
    GROUP BY place_id, place_name, city_slug, type, issue
    ORDER BY last_at DESC
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
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[admin/feedback] PostHog query failed:", res.status, text);
      return NextResponse.json({ error: `posthog_error:${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    const results: unknown[][] = data.results ?? [];

    const reports = results.map((row) => ({
      placeId:   String(row[0] ?? ""),
      placeName: String(row[1] ?? ""),
      citySlug:  String(row[2] ?? ""),
      type:      String(row[3] ?? ""),
      issue:     row[4] ? String(row[4]) : null,
      count:     Number(row[5] ?? 1),
      lastAt:    String(row[6] ?? ""),
    }));

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[admin/feedback] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }
}
