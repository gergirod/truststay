import { NextRequest, NextResponse } from "next/server";
import { saveNarrative } from "@/lib/kv";
import type { StoredNarrative } from "@/lib/kv";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let narrative: StoredNarrative;
  try {
    narrative = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!narrative.citySlug || !narrative.intro) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ok = await saveNarrative({
    ...narrative,
    editedAt: new Date().toISOString(),
  });

  if (!ok) {
    return NextResponse.json({ error: "kv_not_configured" }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
