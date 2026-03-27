import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — returns null if not configured.
 * All callers must handle the null case gracefully.
 */
function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const redis = createRedis();

export interface StoredNarrative {
  citySlug: string;
  cityName: string;
  country: string;
  /** 2–3 sentence editorial intro — shown to all users */
  intro: string;
  activity: "surf" | "dive" | "hike" | "yoga" | "kite" | "work" | null;
  bestMonths: string | null;
  /** 1–2 sentences about the remote-work setup — shown in RoutineSummaryCard */
  summaryText: string;
  /** Short neighborhood name, e.g. "La Punta" */
  baseAreaName: string;
  /** 1 sentence: why this area is the right base */
  baseAreaReason: string;
  generatedAt: string;
  editedAt: string | null;
}

const KEY = (slug: string) => `city-narrative:${slug}`;

export async function getNarrative(slug: string): Promise<StoredNarrative | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(KEY(slug));
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : (data as StoredNarrative);
  } catch {
    return null;
  }
}

export async function saveNarrative(narrative: StoredNarrative): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.set(KEY(narrative.citySlug), JSON.stringify(narrative));
    return true;
  } catch {
    return false;
  }
}

export async function deleteNarrative(slug: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(KEY(slug));
    return true;
  } catch {
    return false;
  }
}

export async function listNarratives(): Promise<StoredNarrative[]> {
  if (!redis) return [];
  try {
    const keys = await redis.keys("city-narrative:*");
    if (!keys.length) return [];
    const values = await redis.mget<(string | StoredNarrative)[]>(...keys);
    return values
      .map((v) => {
        if (!v) return null;
        try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; }
      })
      .filter((v): v is StoredNarrative => v !== null)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch {
    return [];
  }
}
