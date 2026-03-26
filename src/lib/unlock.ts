import { cookies } from "next/headers";

export const UNLOCK_COOKIE = "ts_unlocked";

// Server-side read — call from server components and route handlers only.
export async function isUnlocked(citySlug: string): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(UNLOCK_COOKIE)?.value;
  if (!raw) return false;
  try {
    const slugs: unknown = JSON.parse(raw);
    return Array.isArray(slugs) && slugs.includes(citySlug);
  } catch {
    return false;
  }
}
