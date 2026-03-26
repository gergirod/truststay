import posthog from "posthog-js";

/**
 * Fire a PostHog event safely.
 * - No-ops on the server (SSR)
 * - No-ops if NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set
 * - Swallows any PostHog internal error so analytics never breaks the app
 */
export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // intentionally silent
  }
}
