import { NextRequest, NextResponse } from "next/server";

interface FeedbackBody {
  type: "confirm" | "report";
  issue?: string | null;
  placeId: string;
  placeName: string;
  citySlug: string;
}

export async function POST(req: NextRequest) {
  let body: FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { type, issue, placeId, placeName, citySlug } = body;

  if (!type || !placeId || !citySlug) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type !== "confirm" && type !== "report") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const payload = {
    type,
    issue: issue ?? null,
    placeId,
    placeName,
    citySlug,
    ts: new Date().toISOString(),
  };

  // ── PostHog HTTP capture (uses the public project token — no extra package) ─
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ??
    "https://us.i.posthog.com";

  if (token) {
    try {
      await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: token,
          event: "place_feedback",
          distinct_id: `anon_${placeId}`,
          properties: payload,
        }),
      });
    } catch (err) {
      // Never fail the request over an analytics write
      console.error("[feedback] PostHog capture failed:", err);
    }
  } else {
    console.log("[feedback] received:", payload);
  }

  return NextResponse.json({ ok: true });
}
