import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

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
  if (!citySlug) {
    return NextResponse.json(
      { ok: false, error: "Missing citySlug" },
      { status: 400 }
    );
  }

  const priceId = process.env.CITY_PASS_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { ok: false, error: "Checkout is not configured yet." },
      { status: 503 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${req.headers.get("host")}`;

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payment service is not configured." },
      { status: 503 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
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
