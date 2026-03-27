import { NextRequest, NextResponse } from "next/server";

interface SubscribeBody {
  email: string;
  context: "city_not_found" | "post_payment" | "homepage";
  citySlug?: string;
  neighborhoodSlug?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, context, citySlug, neighborhoodSlug } = body;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  if (!context) {
    return NextResponse.json({ error: "Missing context" }, { status: 400 });
  }

  // ── Resend integration (opt-in via env) ────────────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          unsubscribed: false,
          data: { context, citySlug: citySlug ?? null, neighborhoodSlug: neighborhoodSlug ?? null },
        }),
      });

      if (res.status === 409) {
        // Already exists — treat as success
        return NextResponse.json({ ok: true });
      }

      if (!res.ok) {
        const err = await res.text();
        console.error("[subscribe] Resend error:", res.status, err);
        // Still return 200 — don't block the user for an email API failure
      }
    } catch (err) {
      console.error("[subscribe] Resend fetch failed:", err);
    }
  } else {
    // No email provider configured — log for visibility
    console.log("[subscribe] Email captured (no provider configured):", {
      email,
      context,
      citySlug,
      neighborhoodSlug,
      ts: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
