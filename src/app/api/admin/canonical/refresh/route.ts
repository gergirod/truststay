import { NextRequest, NextResponse } from "next/server";
import { runDestinationRefresh, type RefreshActivity } from "@/lib/canonicalRefresh";

function isAuthorized(req: NextRequest, bodySecret?: string): boolean {
  const secretFromQuery = req.nextUrl.searchParams.get("secret") ?? "";
  const secretFromHeader = req.headers.get("x-admin-secret") ?? "";
  const expected = process.env.ADMIN_SECRET ?? "";
  if (!expected) return false;
  return (
    secretFromQuery === expected ||
    secretFromHeader === expected ||
    bodySecret === expected
  );
}

export async function POST(req: NextRequest) {
  let body: {
    secret?: string;
    citySlug?: string;
    activity?: RefreshActivity;
    structural?: boolean;
    dryRun?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isAuthorized(req, body.secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const citySlug = body.citySlug?.trim();
  if (!citySlug) {
    return NextResponse.json(
      { error: "Missing required field: citySlug" },
      { status: 400 },
    );
  }

  const activity = body.activity ?? "surf";
  try {
    const result = await runDestinationRefresh({
      citySlug,
      activity,
      structural: Boolean(body.structural),
      dryRun: Boolean(body.dryRun),
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message.slice(0, 500) },
      { status: 500 },
    );
  }
}

