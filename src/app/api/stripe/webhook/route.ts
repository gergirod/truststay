import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Per cursor rule 02-unlock-persistence.mdc:
// The webhook validates the Stripe signature and logs events.
// It does NOT write to a database. Unlock state is handled client-side
// via cookie set during the success redirect flow.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // Not configured — accept but warn. Useful during local dev without webhook forwarding.
    console.warn(
      "[webhook] STRIPE_WEBHOOK_SECRET not set — signature validation skipped"
    );
    return NextResponse.json({ received: true });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Payment service not configured" },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const citySlug = session.metadata?.citySlug ?? "unknown";
    const product = session.metadata?.product ?? "unknown";
    console.log(
      `[webhook] checkout.session.completed — product: ${product}, citySlug: ${citySlug}, customer: ${session.customer_email ?? "no email"}`
    );
    // Unlock is persisted via cookie during the success redirect.
    // No database write required per Phase 1 architecture decision.
  }

  return NextResponse.json({ received: true });
}
