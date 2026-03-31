import { buildFinalResponse } from "@/application/use-cases/buildFinalResponse";
import { canonicalRepository } from "@/db/repositories";
import { geocodeDestinationSlug } from "@/lib/destinationGeocode";
import {
  deleteDailyLifeCache,
  deletePlacesCache,
  deleteStayFitNarrativesForCity,
} from "@/lib/kv";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";

export type RefreshActivity =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first"
  | "exploring";

export interface DestinationRefreshInput {
  citySlug: string;
  activity: RefreshActivity;
  structural?: boolean;
  dryRun?: boolean;
}

export interface DestinationRefreshResult {
  citySlug: string;
  cityName: string;
  country: string;
  activity: RefreshActivity;
  structural: boolean;
  zones: number;
  topPick: string;
  invalidated: {
    places: boolean;
    dailyLife: boolean;
    narrativesDeleted: number;
  };
}

function profileForActivity(activity: RefreshActivity, structural: boolean): UserProfile {
  return {
    destination: "",
    duration_days: structural ? 30 : 14,
    main_activity: activity,
    work_mode: structural ? "light" : "balanced",
    daily_balance: structural ? "purpose_first" : "balanced",
    routine_needs: [],
    budget_level: null,
    preferred_vibe: null,
    transport_assumption: "unknown",
    hard_constraints: [],
  };
}

export async function runDestinationRefresh(
  input: DestinationRefreshInput,
): Promise<DestinationRefreshResult> {
  const { citySlug, activity, structural = false, dryRun = false } = input;

  const job = await canonicalRepository.createRefreshJob({
    jobType: structural ? "structural_zones" : "volatile_metrics",
    scopeType: "destination",
    status: "queued",
    metadata: {
      citySlug,
      activity,
      structural,
      dryRun,
    },
  });

  if (job) {
    await canonicalRepository.updateRefreshJobStatus(job.id, "running", {
      started: true,
    });
  }

  try {
    const geocoded = await geocodeDestinationSlug(citySlug);
    if (!geocoded) {
      throw new Error(`Could not geocode destination: ${citySlug}`);
    }

    const profile = profileForActivity(activity, structural);
    profile.destination = `${geocoded.name}, ${geocoded.country}`;

    if (dryRun) {
      const dryResult: DestinationRefreshResult = {
        citySlug,
        cityName: geocoded.name,
        country: geocoded.country,
        activity,
        structural,
        zones: 0,
        topPick: "dry-run",
        invalidated: {
          places: false,
          dailyLife: false,
          narrativesDeleted: 0,
        },
      };
      if (job) {
        await canonicalRepository.updateRefreshJobStatus(job.id, "success", {
          finished: true,
        });
      }
      return dryResult;
    }

    const output = await buildFinalResponse({
      citySlug,
      cityName: geocoded.name,
      country: geocoded.country,
      userProfile: profile,
    });

    // Refresh completed successfully — invalidate stale serving caches.
    const [placesDeleted, dailyDeleted, narrativesDeleted] = await Promise.all([
      deletePlacesCache(citySlug),
      deleteDailyLifeCache(citySlug),
      deleteStayFitNarrativesForCity(citySlug),
    ]);

    if (job) {
      await canonicalRepository.updateRefreshJobStatus(job.id, "success", {
        finished: true,
      });
    }

    return {
      citySlug,
      cityName: geocoded.name,
      country: geocoded.country,
      activity,
      structural,
      zones: output.candidate_micro_areas.length,
      topPick: output.recommendation.top_pick,
      invalidated: {
        places: placesDeleted,
        dailyLife: dailyDeleted,
        narrativesDeleted,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (job) {
      await canonicalRepository.updateRefreshJobStatus(job.id, "failed", {
        finished: true,
        error: message.slice(0, 500),
      });
    }
    throw err;
  }
}

