import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { persistUnlockEntitlementFromStripeSession } from "@/lib/unlockEntitlements";
import { sendUnlockConfirmationEmail } from "@/lib/transactionalEmails";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = env.stripe.webhookSecret;

  if (!webhookSecret) {
    // Not configured — accept but skip validation.
    // Useful during local dev without a webhook forwarding tunnel.
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
    const persistResult = await persistUnlockEntitlementFromStripeSession(session);
    if (persistResult.inserted) {
      await sendUnlockConfirmationEmail(session, { origin: req.nextUrl.origin });
    }
    console.log(
      `[webhook] checkout.session.completed — product: ${product}, citySlug: ${citySlug}, customer: ${session.customer_email ?? "no email"}, persisted=${persistResult.ok ? "yes" : "no"}, inserted=${persistResult.inserted ? "yes" : "no"}`
    );
  }

  return NextResponse.json({ received: true });
}
