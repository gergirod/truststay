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
      properties.citySlug  AS city_slug,
      properties.cityName  AS city_name,
      properties.country   AS country,
      properties.action    AS action,
      count()              AS count,
      max(timestamp)       AS last_at
    FROM events
    WHERE
      event IN ('city_vote', 'city_requested')
      AND timestamp > now() - interval 90 day
    GROUP BY city_slug, city_name, country, action
    ORDER BY count DESC
    LIMIT 50
  `.trim();

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[admin/votes] PostHog query failed:", res.status, text);
      return NextResponse.json({ error: `posthog_error:${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    const results: unknown[][] = data.results ?? [];

    const votes = results.map((row) => ({
      citySlug:  String(row[0] ?? ""),
      cityName:  String(row[1] ?? ""),
      country:   row[2] ? String(row[2]) : null,
      action:    String(row[3] ?? "vote"),
      count:     Number(row[4] ?? 0),
      lastAt:    String(row[5] ?? ""),
    }));

    return NextResponse.json({ votes });
  } catch (err) {
    console.error("[admin/votes] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 200 });
  }
}
