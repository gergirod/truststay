"use server";

import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { UNLOCK_COOKIE, parseSlugs, serializeSlugs } from "@/lib/unlock";

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

  // Write unlock cookie.
  // Per cursor rule 02-unlock-persistence.mdc: no database, cookie-based unlock only.
  // Cookie is HMAC-signed when UNLOCK_SIGNING_KEY is configured.
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(UNLOCK_COOKIE)?.value ?? "";
    const current = parseSlugs(raw);

    if (!current.includes(citySlug)) {
      current.push(citySlug);
    }

    cookieStore.set(UNLOCK_COOKIE, serializeSlugs(current), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  } catch (err) {
    console.error("[verifyAndUnlock] Cookie write error:", err);
    // Non-fatal — return success even if cookie write fails; user can retry
  }

  return { ok: true, citySlug };
}
