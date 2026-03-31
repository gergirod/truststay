import type Stripe from "stripe";
import { env } from "@/lib/env";

function resolveAppUrlFromOrigin(origin: string): string {
  if (env.app.url) return env.app.url.replace(/\/$/, "");
  return origin.replace(/\/$/, "");
}

export async function sendUnlockConfirmationEmail(
  session: Stripe.Checkout.Session,
  opts: { origin: string },
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const toEmail = session.customer_details?.email?.trim() ?? session.customer_email?.trim();
  const citySlug = session.metadata?.citySlug?.trim();
  if (!toEmail || !citySlug) return false;

  const product = session.metadata?.product?.trim() ?? "city_pass";
  const bundleCitySlug = session.metadata?.bundleCitySlug?.trim();
  const appUrl = resolveAppUrlFromOrigin(opts.origin);
  const cityPath = `/city/${product === "city_bundle" && bundleCitySlug ? bundleCitySlug : citySlug}`;
  const cityUrl = `${appUrl}${cityPath}`;
  const restoreUrl = `${appUrl}${cityPath}?restorePrompt=1`;
  const resendFrom = process.env.RESEND_FROM_EMAIL ?? "Truststay <onboarding@resend.dev>";
  const scopeText =
    product === "city_bundle" && bundleCitySlug
      ? `all neighborhoods in ${bundleCitySlug}`
      : citySlug;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [toEmail],
        subject: `Unlocked on Truststay: ${scopeText}`,
        html: `
          <p>Your Truststay unlock is active for <strong>${scopeText}</strong>.</p>
          <p>Open your destination:</p>
          <p><a href="${cityUrl}">${cityUrl}</a></p>
          <p><strong>Using another device/browser?</strong> On the locked page, tap <em>Restore unlocks</em> and use this same email (${toEmail}).</p>
          <p>Quick link to start restore flow:</p>
          <p><a href="${restoreUrl}">${restoreUrl}</a></p>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[email] unlock confirmation send failed:", response.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] unlock confirmation request failed:", err);
    return false;
  }
}
