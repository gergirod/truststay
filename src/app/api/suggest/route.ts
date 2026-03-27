import { NextRequest, NextResponse } from "next/server";

const MAPS_URL_RE = /maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|google\.[a-z.]+\/maps/i;

interface SuggestBody {
  name: string;
  mapsUrl: string;
  category: "work" | "food" | "wellbeing";
  note: string | null;
  citySlug: string;
  neighborhoodSlug: string;
}

export async function POST(req: NextRequest) {
  let body: SuggestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, mapsUrl, category, note, citySlug, neighborhoodSlug } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (name.trim().length > 100) return NextResponse.json({ error: "Name too long" }, { status: 400 });
  if (!mapsUrl?.trim()) return NextResponse.json({ error: "Maps URL is required" }, { status: 400 });
  if (!MAPS_URL_RE.test(mapsUrl)) return NextResponse.json({ error: "Invalid Google Maps URL" }, { status: 400 });
  if (note && note.length > 200) return NextResponse.json({ error: "Note too long" }, { status: 400 });
  if (!["work", "food", "wellbeing"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const payload = {
    name: name.trim(),
    mapsUrl: mapsUrl.trim(),
    category,
    note: note?.trim() || null,
    citySlug,
    neighborhoodSlug,
    ts: new Date().toISOString(),
  };

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
          event: "place_suggested",
          distinct_id: `anon_suggest_${citySlug}`,
          properties: payload,
        }),
      });
    } catch (err) {
      console.error("[suggest] PostHog capture failed:", err);
    }
  } else {
    console.log("[suggest] received:", payload);
  }

  return NextResponse.json({ ok: true });
}
