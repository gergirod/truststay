import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

export const UNLOCK_COOKIE = "ts_unlocked";

// ─── Signing ─────────────────────────────────────────────────────────────────

function hmac(data: string): string {
  return createHmac("sha256", env.unlock.signingKey)
    .update(data)
    .digest("base64url");
}

// Serialize slugs array to a tamper-evident cookie string.
// Signed format:  base64url(JSON) + "." + HMAC-SHA256(JSON)
// Unsigned format: plain JSON (used when UNLOCK_SIGNING_KEY is absent)
export function serializeSlugs(slugs: string[]): string {
  const json = JSON.stringify(slugs);
  if (!env.unlock.signingKey) return json;
  const encoded = Buffer.from(json).toString("base64url");
  const sig = hmac(json);
  return `${encoded}.${sig}`;
}

// Parse and verify slugs from a raw cookie value.
// Returns [] on any tampering, parse error, or empty input.
export function parseSlugs(raw: string): string[] {
  if (!raw) return [];
  try {
    if (env.unlock.signingKey) {
      const dotIdx = raw.lastIndexOf(".");
      if (dotIdx > 0) {
        const encoded = raw.slice(0, dotIdx);
        const sig = raw.slice(dotIdx + 1);
        const json = Buffer.from(encoded, "base64url").toString();
        const expected = hmac(json);

        // Timing-safe comparison prevents oracle attacks
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          console.warn("[unlock] Cookie signature mismatch — rejecting");
          return [];
        }
        return toStringArray(JSON.parse(json));
      }
    }

    // Unsigned format fallback (no signing key, or legacy plain JSON)
    return toStringArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is string => typeof s === "string");
}

// ─── Server-side read ────────────────────────────────────────────────────────

// Server-side only — call from server components and route handlers.
export async function isUnlocked(citySlug: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(UNLOCK_COOKIE)?.value;
  if (!raw) return false;
  return parseSlugs(raw).includes(citySlug);
}
