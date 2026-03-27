import { NextRequest, NextResponse } from "next/server";
import { listNarratives, deleteNarrative } from "@/lib/kv";

function checkSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  return !!process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const narratives = await listNarratives();
  return NextResponse.json({ narratives });
}

export async function DELETE(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({}));
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  await deleteNarrative(slug);
  return NextResponse.json({ ok: true });
}
