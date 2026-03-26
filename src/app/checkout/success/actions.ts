"use server";

import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { UNLOCK_COOKIE } from "@/lib/unlock";

export type VerifyResult =
  | { ok: true; citySlug: string }
  | { ok: false; error: string };

export async function verifyAndUnlock(sessionId: string): Promise<VerifyResult> {
  if (!sessionId?.trim()) {
    return { ok: false, error: "No session ID provided." };
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { ok: false, error: "Payment service is not configured." };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[verifyAndUnlock] Stripe retrieve error:", err);
    return { ok: false, error: "Could not retrieve session from Stripe." };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not completed for this session." };
  }

  const citySlug = session.metadata?.citySlug;
  if (!citySlug) {
    return {
      ok: false,
      error: "City information is missing from this session.",
    };
  }

  // Write unlock cookie — per cursor rule 02-unlock-persistence.mdc:
  // signed cookie preferred, localStorage as fallback.
  // Phase 1 uses an HttpOnly cookie keyed by city slug.
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(UNLOCK_COOKIE)?.value;
    const current: string[] = raw
      ? (JSON.parse(raw) as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : [];

    if (!current.includes(citySlug)) {
      current.push(citySlug);
    }

    cookieStore.set(UNLOCK_COOKIE, JSON.stringify(current), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  } catch (err) {
    console.error("[verifyAndUnlock] Cookie write error:", err);
    // Non-fatal — return success even if cookie write fails; user can refresh
  }

  return { ok: true, citySlug };
}
