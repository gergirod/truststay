import { NextRequest, NextResponse } from "next/server";
import {
  createUnlockRestoreToken,
  getRestorableUnlocksByEmail,
  normalizeEmail,
} from "@/lib/unlockEntitlements";
import { env } from "@/lib/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNextPath(input: string | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

function resolveAppUrl(req: NextRequest): string {
  if (env.app.url) return env.app.url;
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = env.app.isProduction
    ? (req.headers.get("x-forwarded-proto") ?? "https")
    : "http";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: { email?: string; nextPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const nextPath = safeNextPath(body.nextPath);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  const normalized = normalizeEmail(email);
  const unlocks = await getRestorableUnlocksByEmail(normalized);
  const hasUnlocks =
    unlocks.unlockedCitySlugs.length > 0 || unlocks.bundleCitySlugs.length > 0;

  // Prevent account enumeration: return success shape regardless of stored unlocks.
  if (!hasUnlocks) {
    return NextResponse.json({ ok: true });
  }

  const token = await createUnlockRestoreToken(normalized);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Could not create restore link" },
      { status: 503 },
    );
  }

  const appUrl = resolveAppUrl(req);
  const confirmUrl = `${appUrl}/api/unlocks/restore/confirm?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL ?? "Truststay <onboarding@resend.dev>";

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [email],
          subject: "Restore your Truststay unlocks",
          html: `
            <p>Use this secure link to restore your unlocked destinations:</p>
            <p><a href="${confirmUrl}">Restore unlocks</a></p>
            <p>This link expires in 20 minutes and can only be used once.</p>
          `,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[restore] resend failed:", response.status, err);
        return NextResponse.json(
          { ok: false, error: "Could not send restore email" },
          { status: 503 },
        );
      }
    } catch (err) {
      console.error("[restore] send email failed:", err);
      return NextResponse.json(
        { ok: false, error: "Could not send restore email" },
        { status: 503 },
      );
    }
  } else {
    console.warn(`[restore] RESEND_API_KEY missing. Restore link for ${email}: ${confirmUrl}`);
  }

  return NextResponse.json({ ok: true });
}
