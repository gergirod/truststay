import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/db/client";
import { unlockEntitlements, unlockRestoreTokens } from "@/db/schema";

const RESTORE_TOKEN_TTL_MINUTES = 20;

interface RestorableUnlocks {
  unlockedCitySlugs: string[];
  bundleCitySlugs: string[];
}

export interface PersistUnlockEntitlementResult {
  ok: boolean;
  inserted: boolean;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function persistUnlockEntitlementFromStripeSession(
  session: Stripe.Checkout.Session,
): Promise<PersistUnlockEntitlementResult> {
  const db = getDb();
  if (!db) return { ok: false, inserted: false };

  const stripeSessionId = session.id;
  const citySlug = session.metadata?.citySlug?.trim();
  const product = session.metadata?.product?.trim() ?? "city_pass";
  const bundleCitySlug = session.metadata?.bundleCitySlug?.trim();
  const email = session.customer_details?.email?.trim() ?? session.customer_email?.trim();
  const purchasedAt = session.created
    ? new Date(session.created * 1000)
    : new Date();

  if (!stripeSessionId || !citySlug || !email) {
    return { ok: false, inserted: false };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  try {
    const rows = await db
      .insert(unlockEntitlements)
      .values({
        email,
        emailNormalized: normalizeEmail(email),
        product,
        citySlug,
        bundleCitySlug: bundleCitySlug || null,
        stripeSessionId,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: customerId,
        purchasedAt,
      })
      .onConflictDoNothing({
        target: unlockEntitlements.stripeSessionId,
      })
      .returning({ id: unlockEntitlements.id });
    return { ok: true, inserted: rows.length > 0 };
  } catch (err) {
    console.error("[unlocks] failed to persist entitlement:", err);
    return { ok: false, inserted: false };
  }
}

export async function getRestorableUnlocksByEmail(
  emailOrNormalized: string,
): Promise<RestorableUnlocks> {
  const db = getDb();
  if (!db) return { unlockedCitySlugs: [], bundleCitySlugs: [] };

  try {
    const rows = await db
      .select({
        product: unlockEntitlements.product,
        citySlug: unlockEntitlements.citySlug,
        bundleCitySlug: unlockEntitlements.bundleCitySlug,
      })
      .from(unlockEntitlements)
      .where(eq(unlockEntitlements.emailNormalized, normalizeEmail(emailOrNormalized)));

    const unlockedCitySlugs = new Set<string>();
    const bundleCitySlugs = new Set<string>();

    for (const row of rows) {
      if (row.product === "city_bundle" && row.bundleCitySlug) {
        bundleCitySlugs.add(row.bundleCitySlug);
      } else {
        unlockedCitySlugs.add(row.citySlug);
      }
    }

    return {
      unlockedCitySlugs: [...unlockedCitySlugs],
      bundleCitySlugs: [...bundleCitySlugs],
    };
  } catch (err) {
    console.error("[unlocks] failed to load entitlements by email:", err);
    return { unlockedCitySlugs: [], bundleCitySlugs: [] };
  }
}

export async function createUnlockRestoreToken(
  emailOrNormalized: string,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const emailNormalized = normalizeEmail(emailOrNormalized);
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESTORE_TOKEN_TTL_MINUTES * 60 * 1000);

  try {
    await db.insert(unlockRestoreTokens).values({
      emailNormalized,
      tokenHash,
      expiresAt,
    });
    return rawToken;
  } catch (err) {
    console.error("[unlocks] failed to create restore token:", err);
    return null;
  }
}

export async function consumeUnlockRestoreToken(rawToken: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  try {
    const rows = await db
      .select({
        id: unlockRestoreTokens.id,
        emailNormalized: unlockRestoreTokens.emailNormalized,
      })
      .from(unlockRestoreTokens)
      .where(
        and(
          eq(unlockRestoreTokens.tokenHash, tokenHash),
          isNull(unlockRestoreTokens.usedAt),
          gt(unlockRestoreTokens.expiresAt, now),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    await db
      .update(unlockRestoreTokens)
      .set({ usedAt: now })
      .where(eq(unlockRestoreTokens.id, row.id));

    return row.emailNormalized;
  } catch (err) {
    console.error("[unlocks] failed to consume restore token:", err);
    return null;
  }
}
