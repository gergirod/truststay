"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Key written by PaywallCard before redirecting to Stripe.
// sessionStorage survives cross-domain redirects within the same tab,
// so this key is still present when the user lands back on the city page.
export const CHECKOUT_PENDING_KEY = "ts_pending_checkout";

interface Props {
  citySlug: string;
  cityName: string;
  country: string;
  isUnlocked: boolean;
  hasIntent: boolean;
}

/**
 * Detects a completed checkout by reading the sessionStorage key set in
 * PaywallCard right before the Stripe redirect. Fires checkout_success once
 * and clears the key. No-ops if the user was already unlocked before checkout.
 */
export function CheckoutSuccessTracker({
  citySlug,
  cityName,
  country,
  isUnlocked,
  hasIntent,
}: Props) {
  useEffect(() => {
    if (!isUnlocked) return;
    const pending = sessionStorage.getItem(CHECKOUT_PENDING_KEY);
    if (pending !== citySlug) return;
    sessionStorage.removeItem(CHECKOUT_PENDING_KEY);
    track("checkout_success", {
      city_slug: citySlug,
      city_name: cityName,
      country,
      is_unlocked: true,
      intent_preserved: hasIntent,
    });
  }, [citySlug, cityName, country, isUnlocked, hasIntent]);

  return null;
}
