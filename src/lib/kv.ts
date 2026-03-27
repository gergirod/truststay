import { Redis } from "@upstash/redis";
import type { Place } from "@/types";

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

// ── Place cache ──────────────────────────────────────────────────────────────

export interface CachedPlaces {
  citySlug: string;
  cityName: string;
  /** Place list — raw OSM on first save, Google-enriched once an unlocked user visits */
  places: Place[];
  cachedAt: string;
  /** Set when Google enrichment data has been merged in */
  enrichedAt?: string;
  /** How many places of each type */
  counts: { work: number; food: number; wellbeing: number; total: number };
}

const PLACES_KEY = (slug: string) => `city-places:${slug}`;
/** 14 days — OSM data is stable; admin can force-refresh anytime */
const PLACES_TTL_SECONDS = 14 * 24 * 60 * 60;

export async function getPlacesCache(slug: string): Promise<CachedPlaces | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(PLACES_KEY(slug));
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : (data as CachedPlaces);
  } catch {
    return null;
  }
}

export async function savePlacesCache(
  citySlug: string,
  cityName: string,
  places: Place[],
  opts: { enriched?: boolean; existingCachedAt?: string } = {}
): Promise<boolean> {
  if (!redis) return false;
  try {
    const counts = {
      work: places.filter((p) => p.category === "coworking" || p.category === "cafe").length,
      food: places.filter((p) => p.category === "food").length,
      wellbeing: places.filter((p) => p.category === "gym").length,
      total: places.length,
    };
    const now = new Date().toISOString();
    const payload: CachedPlaces = {
      citySlug,
      cityName,
      places,
      cachedAt: opts.existingCachedAt ?? now,
      ...(opts.enriched ? { enrichedAt: now } : {}),
      counts,
    };
    await redis.set(PLACES_KEY(citySlug), JSON.stringify(payload), {
      ex: PLACES_TTL_SECONDS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deletePlacesCache(slug: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(PLACES_KEY(slug));
    return true;
  } catch {
    return false;
  }
}

export async function listPlacesCaches(): Promise<Omit<CachedPlaces, "places">[]> {
  if (!redis) return [];
  try {
    const keys = await redis.keys("city-places:*");
    if (!keys.length) return [];
    const values = await redis.mget<(string | CachedPlaces)[]>(...keys);
    return values
      .map((v) => {
        if (!v) return null;
        try {
          const parsed: CachedPlaces =
            typeof v === "string" ? JSON.parse(v) : v;
          // Return metadata only — omit the full places array to keep response small
          const { places: _places, ...meta } = parsed;
          void _places;
          return meta;
        } catch {
          return null;
        }
      })
      .filter((v): v is Omit<CachedPlaces, "places"> => v !== null)
      .sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
  } catch {
    return [];
  }
}
