import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { UNLOCK_COOKIE, parseSlugs, serializeSlugs } from "@/lib/unlock";
import { env } from "@/lib/env";

// Route Handler — the only correct place to set cookies while also redirecting.
// cookies().set() is forbidden in Server Component render context, so the
// success page hands off here immediately via redirect().
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  const origin = req.nextUrl.origin;

  if (!sessionId) {
    return NextResponse.redirect(new URL("/", origin));
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    // Stripe not configured — redirect to cancel, nothing was charged
    return NextResponse.redirect(new URL("/checkout/cancel", origin));
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[finalize] Stripe session retrieve error:", err);
    return NextResponse.redirect(new URL("/checkout/cancel", origin));
  }

  if (session.payment_status !== "paid") {
    return NextResponse.redirect(new URL("/checkout/cancel", origin));
  }

  const citySlug = session.metadata?.citySlug;
  if (!citySlug) {
    console.error("[finalize] citySlug missing from session metadata:", sessionId);
    return NextResponse.redirect(new URL("/", origin));
  }

  // Read any previously unlocked slugs from the incoming request cookie
  const rawExisting = req.cookies.get(UNLOCK_COOKIE)?.value ?? "";
  const current = parseSlugs(rawExisting);
  if (!current.includes(citySlug)) {
    current.push(citySlug);
  }

  // Set the unlock cookie on the redirect response.
  // Set-Cookie on a redirect response is fully valid — the browser stores it
  // before following the redirect, so the city page receives it on first load.
  const response = NextResponse.redirect(new URL(`/city/${citySlug}`, origin));
  response.cookies.set(UNLOCK_COOKIE, serializeSlugs(current), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.app.isProduction,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return response;
}
