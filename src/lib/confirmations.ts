export interface PlaceConfirmData {
  confirmCount: number;
  reportCount: number;
  lastConfirmedAt: string | null;
}

/**
 * Returns a map of placeId → confirmation/report data for a city slug.
 *
 * Caching is handled by Next.js fetch() with next.revalidate — no unstable_cache
 * needed (and avoided because unstable_cache can't serialize Map objects).
 */
export async function getPlaceConfirmations(
  citySlug: string
): Promise<Map<string, PlaceConfirmData>> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) return new Map();

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ??
    "https://us.i.posthog.com";

  const query = `
    SELECT
      properties.placeId   AS place_id,
      properties.type      AS type,
      count()              AS count,
      max(timestamp)       AS last_at
    FROM events
    WHERE
      event = 'place_feedback'
      AND properties.citySlug = '${citySlug.replace(/'/g, "''")}'
      AND timestamp > now() - interval 90 day
    GROUP BY place_id, type
  `.trim();

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      next: { revalidate: 21600 }, // 6-hour cache via Next.js fetch cache
    });

    if (!res.ok) return new Map();

    const data = await res.json();
    const results: unknown[][] = data.results ?? [];

    const map = new Map<string, PlaceConfirmData>();

    for (const row of results) {
      const placeId = String(row[0] ?? "");
      const type = String(row[1] ?? "");
      const count = Number(row[2] ?? 0);
      const lastAt = row[3] ? String(row[3]) : null;

      if (!placeId) continue;

      const existing = map.get(placeId) ?? {
        confirmCount: 0,
        reportCount: 0,
        lastConfirmedAt: null,
      };

      if (type === "confirm") {
        existing.confirmCount = count;
        existing.lastConfirmedAt = lastAt;
      } else if (type === "report") {
        existing.reportCount = count;
      }

      map.set(placeId, existing);
    }

    return map;
  } catch {
    return new Map();
  }
}
