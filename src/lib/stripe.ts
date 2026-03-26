import Stripe from "stripe";
import { env } from "./env";

// Lazy singleton — avoids crashing at build time when env var is absent.
// Call getStripe() only inside request handlers, not at module load.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.stripe.secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to your .env.local file."
      );
    }
    _stripe = new Stripe(env.stripe.secretKey, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}
