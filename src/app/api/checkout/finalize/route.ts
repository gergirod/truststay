import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  UNLOCK_COOKIE,
  BUNDLE_COOKIE,
  parseSlugs,
  serializeSlugs,
} from "@/lib/unlock";
import { env } from "@/lib/env";
import { persistUnlockEntitlementFromStripeSession } from "@/lib/unlockEntitlements";
import { sendUnlockConfirmationEmail } from "@/lib/transactionalEmails";
import { saveUserStaySetup, TRUSTSTAY_USER_COOKIE } from "@/lib/kv";

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

  persistUnlockEntitlementFromStripeSession(session)
    .then((result) => {
      if (result.inserted) {
        sendUnlockConfirmationEmail(session, { origin }).catch((err) =>
          console.warn("[finalize] unlock confirmation email failed:", err),
        );
      }
    })
    .catch((err) => console.warn("[finalize] entitlement persistence failed:", err));

  const citySlug = session.metadata?.citySlug;
  const product = session.metadata?.product;
  const bundleCitySlug = session.metadata?.bundleCitySlug;
  const purpose = session.metadata?.purpose;
  const workStyle = session.metadata?.workStyle;
  const dailyBalance = session.metadata?.dailyBalance;

  if (!citySlug) {
    console.error("[finalize] citySlug missing from session metadata:", sessionId);
    return NextResponse.redirect(new URL("/", origin));
  }

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.app.isProduction,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
  const userId = req.cookies.get(TRUSTSTAY_USER_COOKIE)?.value ?? crypto.randomUUID();

  const intentParams = new URLSearchParams();
  intentParams.set("justUnlocked", "1");
  const hasFullIntent = Boolean(purpose && workStyle);
  const hasPartialIntent = Boolean((purpose && !workStyle) || (!purpose && workStyle));
  if (hasFullIntent) {
    intentParams.set("purpose", purpose!);
    intentParams.set("workStyle", workStyle!);
    if (dailyBalance) intentParams.set("dailyBalance", dailyBalance);
  } else if (hasPartialIntent) {
    intentParams.set("intentIncomplete", "1");
    console.warn(
      `[finalize] partial intent metadata for session=${sessionId} city=${citySlug} purpose=${purpose ?? "none"} workStyle=${workStyle ?? "none"}`,
    );
  }

  if (product === "city_bundle" && bundleCitySlug) {
    // Bundle purchase: unlock all neighborhoods in the parent city
    const rawBundle = req.cookies.get(BUNDLE_COOKIE)?.value ?? "";
    const current = parseSlugs(rawBundle);
    if (!current.includes(bundleCitySlug)) {
      current.push(bundleCitySlug);
    }
    const response = NextResponse.redirect(
      new URL(`/city/${bundleCitySlug}?${intentParams.toString()}`, origin)
    );
    response.cookies.set(TRUSTSTAY_USER_COOKIE, userId, cookieOpts);
    response.cookies.set(BUNDLE_COOKIE, serializeSlugs(current), cookieOpts);
    return response;
  }

  // Individual neighborhood / city pass
  const rawExisting = req.cookies.get(UNLOCK_COOKIE)?.value ?? "";
  const current = parseSlugs(rawExisting);
  if (!current.includes(citySlug)) {
    current.push(citySlug);
  }

  // Set-Cookie on a redirect response is valid — browser stores it before following.
  const response = NextResponse.redirect(
    new URL(`/city/${citySlug}?${intentParams.toString()}`, origin)
  );
  response.cookies.set(TRUSTSTAY_USER_COOKIE, userId, cookieOpts);
  response.cookies.set(UNLOCK_COOKIE, serializeSlugs(current), cookieOpts);
  if (hasFullIntent) {
    saveUserStaySetup({
      userId,
      citySlug,
      purpose: purpose!,
      workStyle: workStyle!,
      ...(dailyBalance ? { dailyBalance } : {}),
    }).catch((err) => {
      console.warn("[finalize] failed to save user stay setup:", err);
    });
  }
  return response;
}
