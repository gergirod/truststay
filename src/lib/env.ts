// Server-side only. Do not import this file in client components.
// Centralizes env reads and produces clear startup warnings.

export const env = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    cityPassPriceId: process.env.CITY_PASS_PRICE_ID ?? "",
  },
  unlock: {
    signingKey: process.env.UNLOCK_SIGNING_KEY ?? "",
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? "",
    isProduction: process.env.NODE_ENV === "production",
  },
} as const;

// Warn about missing critical vars at server startup.
// These appear in Vercel function logs and local dev console.
(function checkEnv() {
  const missing: string[] = [];

  if (!env.stripe.secretKey) missing.push("STRIPE_SECRET_KEY");
  if (!env.stripe.cityPassPriceId) missing.push("CITY_PASS_PRICE_ID");

  for (const name of missing) {
    console.warn(
      `[Trustay] Missing env var: ${name} — Stripe checkout will not work`
    );
  }

  if (!env.stripe.webhookSecret) {
    console.warn(
      "[Trustay] STRIPE_WEBHOOK_SECRET not set — webhook signature validation will be skipped"
    );
  }

  if (!env.unlock.signingKey) {
    console.warn(
      "[Trustay] UNLOCK_SIGNING_KEY not set — unlock cookie will not be HMAC-signed (less secure)"
    );
  }
})();
