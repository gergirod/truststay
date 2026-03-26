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

// Warn about missing vars at server startup.
// Messages appear in Vercel function logs and local dev console.
(function checkEnv() {
  if (!env.stripe.secretKey) {
    console.warn(
      "[Trustay] STRIPE_SECRET_KEY not set — Stripe checkout will not work. " +
        "Add this in Vercel → Settings → Environment Variables."
    );
  }

  if (!env.stripe.cityPassPriceId) {
    console.warn(
      "[Trustay] CITY_PASS_PRICE_ID not set — Stripe checkout will not work. " +
        "Create a one-time price in the Stripe dashboard and paste the price_... ID."
    );
  }

  if (!env.stripe.webhookSecret) {
    console.warn(
      "[Trustay] STRIPE_WEBHOOK_SECRET not set — webhook signature validation will be skipped. " +
        "Add the whsec_... secret from your Stripe webhook endpoint."
    );
  }

  if (!env.unlock.signingKey) {
    console.warn(
      "[Trustay] UNLOCK_SIGNING_KEY not set — unlock cookie will not be HMAC-signed. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  if (env.app.isProduction && !env.app.url) {
    console.warn(
      "[Trustay] NEXT_PUBLIC_APP_URL not set in production — Stripe redirect URLs will be " +
        "inferred from request headers. Set this to your Vercel deployment URL (e.g. https://truststay.com)."
    );
  }
})();
