import { Redis } from "@upstash/redis";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { stayFitNarrativeCache } from "@/db/schema";
import type { Place, DailyLifePlace } from "@/types";
import type { PlaceReview } from "@/lib/googlePlaces";

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

// ── Daily-life place cache ────────────────────────────────────────────────────

export interface CachedDailyLife {
  citySlug: string;
  cityName: string;
  places: DailyLifePlace[];
  cachedAt: string;
  counts: { grocery: number; convenience: number; pharmacy: number; laundry: number; total: number };
}

const DAILY_LIFE_KEY = (slug: string) => `city-daily-life:${slug}`;
/** 14 days — daily-life infrastructure changes slowly */
const DAILY_LIFE_TTL_SECONDS = 14 * 24 * 60 * 60;

export async function getDailyLifeCache(slug: string): Promise<CachedDailyLife | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(DAILY_LIFE_KEY(slug));
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : (data as CachedDailyLife);
  } catch {
    return null;
  }
}

export async function saveDailyLifeCache(
  citySlug: string,
  cityName: string,
  places: DailyLifePlace[]
): Promise<boolean> {
  if (!redis) return false;
  try {
    const counts = {
      grocery: places.filter((p) => p.type === "grocery").length,
      convenience: places.filter((p) => p.type === "convenience").length,
      pharmacy: places.filter((p) => p.type === "pharmacy").length,
      laundry: places.filter((p) => p.type === "laundry").length,
      total: places.length,
    };
    const payload: CachedDailyLife = {
      citySlug,
      cityName,
      places,
      cachedAt: new Date().toISOString(),
      counts,
    };
    await redis.set(DAILY_LIFE_KEY(citySlug), JSON.stringify(payload), {
      ex: DAILY_LIFE_TTL_SECONDS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteDailyLifeCache(slug: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(DAILY_LIFE_KEY(slug));
    return true;
  } catch {
    return false;
  }
}

// ── Enriched place details cache ─────────────────────────────────────────────
// Stores Google Place Details (including reviews) for all enriched places in a city.
// Keyed by citySlug only — shared across all intent combinations.
// Phase 1 of the enrichment agent pipeline.

export interface EnrichedPlaceDetail {
  placeId: string;
  name: string;
  /** Place category for context in LLM prompts */
  category: string;
  reviews: PlaceReview[];
  openingHours: string[];
  editorialSummary?: string;
  priceLevel?: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  distanceFromBasekm?: number;
}

export interface CachedEnrichedPlaces {
  citySlug: string;
  cityName: string;
  places: EnrichedPlaceDetail[];
  fetchedAt: string;
  totalFetched: number;
}

const ENRICHED_PLACES_KEY = (slug: string) => `enriched-places:${slug}`;
/** 30 days — reviews change slowly; aligned with stay-fit narrative TTL */
const ENRICHED_PLACES_TTL = 30 * 24 * 60 * 60;

export async function getEnrichedPlaces(
  slug: string
): Promise<CachedEnrichedPlaces | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(ENRICHED_PLACES_KEY(slug));
    if (!data) return null;
    return typeof data === "string"
      ? JSON.parse(data)
      : (data as CachedEnrichedPlaces);
  } catch {
    return null;
  }
}

export async function saveEnrichedPlaces(
  citySlug: string,
  cityName: string,
  places: EnrichedPlaceDetail[]
): Promise<boolean> {
  if (!redis) return false;
  try {
    const payload: CachedEnrichedPlaces = {
      citySlug,
      cityName,
      places,
      fetchedAt: new Date().toISOString(),
      totalFetched: places.length,
    };
    await redis.set(ENRICHED_PLACES_KEY(citySlug), JSON.stringify(payload), {
      ex: ENRICHED_PLACES_TTL,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteEnrichedPlaces(slug: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(ENRICHED_PLACES_KEY(slug));
    return true;
  } catch {
    return false;
  }
}

// ── Stay-fit narrative cache ──────────────────────────────────────────────────
// Keyed by city slug + intent (purpose + workStyle).
// Generated once by the LLM on first request; cached for 30 days.
// The LLM is given only structured `narrativeInputs` — no free-form context.

export interface CachedStayFitNarrative {
  citySlug: string;
  purpose: string;
  workStyle: string;
  /** dailyBalance is part of the cache key — different balance = different narrative tone */
  dailyBalance?: string;
  /** 2–3 sentences: why this base fits this specific stay */
  whyItFits: string;
  /** 2 sentences: what a realistic work day from this base looks like */
  dailyRhythm?: string;
  /** 1–2 sentences: what's actually walkable for food/coffee */
  walkingOptions?: string;
  /** 1–2 sentences: what to prepare for / plan around */
  planAround: string;
  /** 1 sentence: grocery/pharmacy/transport reality */
  logistics?: string;
  generatedAt: string;
  /**
   * true = generated by the enrichment agent (review-grounded, web-search-backed).
   * false/absent = generated by the basic narrative generator (scoring inputs only).
   */
  enriched?: boolean;
  /**
   * Optional cached micro-area narratives for stacked unlocked rendering.
   * Added after initial rollout; older cache entries may not include it.
   */
  microAreaNarratives?: CachedMicroAreaNarrative[];
}

export interface CachedMicroAreaNarrative {
  microAreaId: string;
  name: string;
  rank: number;
  score: number;
  hasConstraintBreakers: boolean;
  readiness?: {
    workSetup: "strong" | "moderate" | "limited";
    dailyRoutine: "strong" | "moderate" | "limited";
    activityAccess: "strong" | "moderate" | "limited";
    movement: "strong" | "moderate" | "limited";
  };
  center?: { lat: number; lon: number };
  radius_km?: number;
  narrativeText: {
    whyItFits: string;
    dailyRhythm: string;
    walkingOptions: string;
    planAround: string;
    logistics: string;
  };
}

export const TRUSTSTAY_USER_COOKIE = "ts_uid";

export interface SavedUserStaySetup {
  userId: string;
  citySlug: string;
  purpose: string;
  workStyle: string;
  dailyBalance?: string;
  updatedAt: string;
}

export interface CityLastEnrichedSetup {
  citySlug: string;
  purpose: string;
  workStyle: string;
  dailyBalance?: string;
  updatedAt: string;
}

const USER_STAY_SETUP_KEY = (userId: string, citySlug: string) =>
  `user-stay-setup:${userId}:${citySlug}`;
const CITY_LAST_ENRICHED_SETUP_KEY = (citySlug: string) =>
  `city-last-enriched-setup:${citySlug}`;
/** 180 days — keeps each user's city setup sticky across visits. */
const USER_STAY_SETUP_TTL_SECONDS = 180 * 24 * 60 * 60;
const CITY_LAST_ENRICHED_SETUP_TTL_SECONDS = 180 * 24 * 60 * 60;

const STAY_FIT_KEY = (
  slug: string,
  purpose: string,
  workStyle: string,
  dailyBalance?: string
) => `stay-fit-narrative:${slug}:${purpose}:${workStyle}:${dailyBalance ?? "balanced"}`;
/** 30 days — place data + LLM output is stable; refresh when forced by admin */
const STAY_FIT_TTL_SECONDS = 30 * 24 * 60 * 60;

function normalizedBalance(dailyBalance?: string): string {
  return dailyBalance ?? "balanced";
}

async function getStayFitNarrativeFromDb(
  citySlug: string,
  purpose: string,
  workStyle: string,
  dailyBalance?: string,
): Promise<CachedStayFitNarrative | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select({ payload: stayFitNarrativeCache.payload })
      .from(stayFitNarrativeCache)
      .where(
        and(
          eq(stayFitNarrativeCache.citySlug, citySlug),
          eq(stayFitNarrativeCache.purpose, purpose),
          eq(stayFitNarrativeCache.workStyle, workStyle),
          eq(stayFitNarrativeCache.dailyBalance, normalizedBalance(dailyBalance)),
        ),
      )
      .limit(1);
    const payload = rows[0]?.payload;
    if (!payload || typeof payload !== "object") return null;
    return payload as CachedStayFitNarrative;
  } catch (err) {
    console.warn("[kv] DB read failed for stay-fit narrative cache:", err);
    return null;
  }
}

async function saveStayFitNarrativeToDb(
  narrative: CachedStayFitNarrative,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await db
      .insert(stayFitNarrativeCache)
      .values({
        citySlug: narrative.citySlug,
        purpose: narrative.purpose,
        workStyle: narrative.workStyle,
        dailyBalance: normalizedBalance(narrative.dailyBalance),
        payload: narrative,
        generatedAt: new Date(narrative.generatedAt),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          stayFitNarrativeCache.citySlug,
          stayFitNarrativeCache.purpose,
          stayFitNarrativeCache.workStyle,
          stayFitNarrativeCache.dailyBalance,
        ],
        set: {
          payload: narrative,
          generatedAt: new Date(narrative.generatedAt),
          updatedAt: new Date(),
        },
      });
    return true;
  } catch (err) {
    console.warn("[kv] DB write failed for stay-fit narrative cache:", err);
    return false;
  }
}

export async function getStayFitNarrative(
  citySlug: string,
  purpose: string,
  workStyle: string,
  dailyBalance?: string
): Promise<CachedStayFitNarrative | null> {
  const key = STAY_FIT_KEY(citySlug, purpose, workStyle, dailyBalance);
  if (redis) {
    try {
      const data = await redis.get(key);
      if (data) {
        const parsed = typeof data === "string"
          ? JSON.parse(data)
          : (data as CachedStayFitNarrative);
        console.log(
          `[kv] stay-fit redis hit key=${key} microAreas=${parsed.microAreaNarratives?.length ?? 0}`,
        );
        return parsed;
      }
    } catch {
      // Continue to DB fallback below.
    }
  }

  const dbCached = await getStayFitNarrativeFromDb(
    citySlug,
    purpose,
    workStyle,
    dailyBalance,
  );
  if (dbCached && redis) {
    console.log(
      `[kv] stay-fit db hit key=${key} microAreas=${dbCached.microAreaNarratives?.length ?? 0}`,
    );
    try {
      await redis.set(
        key,
        JSON.stringify(dbCached),
        { ex: STAY_FIT_TTL_SECONDS },
      );
    } catch {
      // Ignore Redis backfill failures.
    }
  }
  return dbCached;
}

export async function saveStayFitNarrative(
  narrative: CachedStayFitNarrative
): Promise<boolean> {
  let saved = false;
  const key = STAY_FIT_KEY(
    narrative.citySlug,
    narrative.purpose,
    narrative.workStyle,
    narrative.dailyBalance
  );

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(narrative), {
        ex: STAY_FIT_TTL_SECONDS,
      });
      saved = true;
    } catch {
      // Continue to DB fallback below.
    }
  }

  const dbSaved = await saveStayFitNarrativeToDb(narrative);
  console.log(
    `[kv] stay-fit save key=${key} redisSaved=${saved} dbSaved=${dbSaved} microAreas=${narrative.microAreaNarratives?.length ?? 0}`,
  );
  return saved || dbSaved;
}

export async function deleteStayFitNarrative(
  citySlug: string,
  purpose: string,
  workStyle: string,
  dailyBalance?: string
): Promise<boolean> {
  let deleted = false;
  if (redis) {
    try {
      await redis.del(STAY_FIT_KEY(citySlug, purpose, workStyle, dailyBalance));
      deleted = true;
    } catch {
      // Continue to DB delete below.
    }
  }

  const db = getDb();
  if (!db) return deleted;
  try {
    await db.delete(stayFitNarrativeCache).where(
      and(
        eq(stayFitNarrativeCache.citySlug, citySlug),
        eq(stayFitNarrativeCache.purpose, purpose),
        eq(stayFitNarrativeCache.workStyle, workStyle),
        eq(stayFitNarrativeCache.dailyBalance, normalizedBalance(dailyBalance)),
      ),
    );
    return true;
  } catch {
    return deleted;
  }
}

/**
 * Delete all cached stay-fit narratives for a city across intents/balances.
 * Useful after bulk refresh jobs.
 */
export async function deleteStayFitNarrativesForCity(
  citySlug: string
): Promise<number> {
  let deleted = 0;
  if (redis) {
    try {
      const keys = await redis.keys(`stay-fit-narrative:${citySlug}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } catch {
      // Continue to DB delete below.
    }
  }

  const db = getDb();
  if (!db) return deleted;
  try {
    const rows = await db
      .select({ id: stayFitNarrativeCache.id })
      .from(stayFitNarrativeCache)
      .where(eq(stayFitNarrativeCache.citySlug, citySlug));
    if (rows.length > 0) {
      await db
        .delete(stayFitNarrativeCache)
        .where(eq(stayFitNarrativeCache.citySlug, citySlug));
      deleted = Math.max(deleted, rows.length);
    }
    return deleted;
  } catch {
    return deleted;
  }
}

export async function getUserStaySetup(
  userId: string,
  citySlug: string,
): Promise<SavedUserStaySetup | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(USER_STAY_SETUP_KEY(userId, citySlug));
    if (!data) return null;
    return typeof data === "string"
      ? JSON.parse(data)
      : (data as SavedUserStaySetup);
  } catch {
    return null;
  }
}

export async function saveUserStaySetup(
  setup: Omit<SavedUserStaySetup, "updatedAt">,
): Promise<boolean> {
  if (!redis) return false;
  try {
    const payload: SavedUserStaySetup = {
      ...setup,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(
      USER_STAY_SETUP_KEY(setup.userId, setup.citySlug),
      JSON.stringify(payload),
      { ex: USER_STAY_SETUP_TTL_SECONDS },
    );
    return true;
  } catch {
    return false;
  }
}

export async function getLastEnrichedSetupForCity(
  citySlug: string,
): Promise<CityLastEnrichedSetup | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(CITY_LAST_ENRICHED_SETUP_KEY(citySlug));
    if (!data) return null;
    return typeof data === "string"
      ? JSON.parse(data)
      : (data as CityLastEnrichedSetup);
  } catch {
    return null;
  }
}

export async function saveLastEnrichedSetupForCity(
  setup: Omit<CityLastEnrichedSetup, "updatedAt">,
): Promise<boolean> {
  if (!redis) return false;
  try {
    const payload: CityLastEnrichedSetup = {
      ...setup,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(
      CITY_LAST_ENRICHED_SETUP_KEY(setup.citySlug),
      JSON.stringify(payload),
      { ex: CITY_LAST_ENRICHED_SETUP_TTL_SECONDS },
    );
    return true;
  } catch {
    return false;
  }
}
