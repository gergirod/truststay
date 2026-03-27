import { NextRequest, NextResponse } from "next/server";
import { listPlacesCaches, deletePlacesCache } from "@/lib/kv";

function auth(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return secret === process.env.ADMIN_SECRET;
}

/** GET /api/admin/places — list all cities with cached places (metadata only) */
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const caches = await listPlacesCaches();
  return NextResponse.json({ caches });
}

/** DELETE /api/admin/places — invalidate a city's place cache */
export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const ok = await deletePlacesCache(slug);
  return NextResponse.json({ ok });
}
