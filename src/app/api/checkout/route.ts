import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

function resolveAppUrl(req: NextRequest): string {
  if (env.app.url) return env.app.url;
  // Derive from request headers — works on Vercel and most proxied deployments
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = env.app.isProduction
    ? (req.headers.get("x-forwarded-proto") ?? "https")
    : "http";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  let body: { product?: string; citySlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { product, citySlug } = body;
  if (!citySlug?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing citySlug" },
      { status: 400 }
    );
  }

  if (!env.stripe.cityPassPriceId) {
    return NextResponse.json(
      { ok: false, error: "Checkout is not configured yet." },
      { status: 503 }
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payment service is not configured." },
      { status: 503 }
    );
  }

  const appUrl = resolveAppUrl(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: env.stripe.cityPassPriceId, quantity: 1 }],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel?slug=${encodeURIComponent(citySlug)}`,
      metadata: {
        product: product ?? "city_pass",
        citySlug,
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not create checkout session." },
      { status: 500 }
    );
  }
}
