import { NextRequest, NextResponse } from "next/server";

interface VoteBody {
  citySlug: string;
  cityName: string;
  country?: string;
  action?: "vote" | "request";
}

export async function POST(req: NextRequest) {
  let body: VoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { citySlug, cityName, country, action = "vote" } = body;

  if (!citySlug || !cityName) {
    return NextResponse.json({ error: "Missing citySlug or cityName" }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ??
    "https://us.i.posthog.com";

  const eventName = action === "request" ? "city_requested" : "city_vote";

  if (token) {
    try {
      await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: token,
          event: eventName,
          distinct_id: `anon_vote_${citySlug}`,
          properties: {
            citySlug,
            cityName,
            country: country ?? null,
            action,
            ts: new Date().toISOString(),
          },
        }),
      });
    } catch (err) {
      console.error(`[vote] PostHog capture failed:`, err);
    }
  } else {
    console.log(`[vote] ${eventName}:`, { citySlug, cityName, country });
  }

  return NextResponse.json({ ok: true });
}
