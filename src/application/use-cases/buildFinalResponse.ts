/**
 * buildFinalResponse — orchestrates the full scoring pipeline.
 *
 * Given a destination + intent, returns a complete FinalOutput:
 *   1. Adjust weights from intent
 *   2. Discover micro-areas dynamically
 *   3. Gather evidence packs live
 *   4. Score each micro-area
 *   5. Rank
 *   6. Build recommendation
 *   7. Return FinalOutput (validated by Zod)
 *
 * The LLM narration step happens OUTSIDE this function —
 * this is the deterministic layer.
 */

import { adjustWeights } from "./adjustWeights";
import { scoreMicroArea } from "@/domain/services/scoring.service";
import { rankMicroAreas } from "./rankOptions";
import { generateRecommendation } from "./generateRecommendation";
import { DEFAULT_WEIGHTS } from "@/data/scoring-config";
import { FinalOutputSchema } from "@/schemas/zod/finalOutput.schema";
import type { FinalOutput, MicroAreaOutput } from "@/schemas/zod/finalOutput.schema";
import type { UserProfile } from "@/schemas/zod/userProfile.schema";
import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";
import type { ScoreCard } from "@/schemas/zod/scoreCard.schema";
import { discoverMicroAreas } from "./discoverMicroAreas";
import type { MicroAreaDef } from "./discoverMicroAreas";
import { gatherEvidenceForMicroArea } from "@/infrastructure/providers/gatherEvidence";
import { canonicalRepository } from "@/db/repositories";
import { connectivityRepository } from "@/db/repositories";
import { ensureConnectivityPrecomputedForCitySlug } from "@/lib/connectivity/service";
import { buildConnectivitySummary } from "@/lib/connectivity/scoring";
import type { ConnectivitySummary, StarlinkFallback } from "@/lib/connectivity/types";

const MAX_ZONE_DISTANCE_FROM_ANCHOR_KM = 22;
const MIN_ACCEPTED_EVIDENCE_SCORE = 2.5;

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const stackTop = err.stack?.split("\n")[1]?.trim();
    return `${err.name}: ${err.message}${stackTop ? ` | ${stackTop}` : ""}`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export interface RecommendationInput {
  citySlug: string;
  cityName: string;
  country: string;
  userProfile: UserProfile;
}

export async function buildFinalResponse(
  input: RecommendationInput
): Promise<FinalOutput> {
  const { citySlug, cityName, country, userProfile } = input;
  console.log(
    `[buildFinalResponse] start city=${citySlug} activity=${userProfile.main_activity} work=${userProfile.work_mode} balance=${userProfile.daily_balance ?? "balanced"}`,
  );

  // Step 1: Adjust weights
  const weights = adjustWeights(DEFAULT_WEIGHTS, userProfile);

  // Step 2: Discover micro-areas dynamically
  const microAreas = await resolveMicroAreas(
    citySlug,
    cityName,
    country,
    userProfile.main_activity,
  );

  // Step 3: Gather evidence packs live (Google Places + LLM)
  const evidencePacksRaw = await resolveEvidencePacks(
    citySlug,
    cityName,
    country,
    microAreas,
  );
  const { acceptedMicroAreas, acceptedEvidencePacks } = gateMicroAreasByEvidence(
    microAreas,
    evidencePacksRaw,
  );
  console.log(
    `[buildFinalResponse] evidence_gate city=${citySlug} accepted=${acceptedMicroAreas.length}/${microAreas.length}`,
  );
  const evidencePacks = acceptedEvidencePacks;

  // Track unknowns and assumptions
  const assumptions: string[] = [];
  const unknowns: string[] = [];

  if (userProfile.transport_assumption === "unknown") {
    assumptions.push("Transport assumption: unknown — penalizing areas that require scooter or car without stated transport");
  }
  if (userProfile.duration_days === null) {
    assumptions.push("Duration unknown — using 14-day assumption for weight calculation");
  }
  if (userProfile.budget_level === null) {
    unknowns.push("Budget not specified — using neutral budget scoring (5/10)");
  }

  // Step 4: Score each micro-area
  const scoreCards: ScoreCard[] = evidencePacks.map((ep) => {
    const card = scoreMicroArea(ep, weights, userProfile);
    // Set real name from micro-area data
    const ma = acceptedMicroAreas.find((m) => m.id === ep.micro_area_id);
    return { ...card, micro_area_name: ma?.name ?? ep.micro_area_id };
  });

  const connectivityByArea = await resolveConnectivityByMicroArea(
    citySlug,
    acceptedMicroAreas,
  );
  applyConnectivityToScoreCards(scoreCards, weights, connectivityByArea);

  // Collect unknowns from thin evidence
  for (const card of scoreCards) {
    if (card.confidence < 0.5) {
      unknowns.push(`Evidence for ${card.micro_area_name} is thin — scores may not reflect reality`);
    }
  }

  // Step 5: Rank
  const rankingResult = rankMicroAreas(scoreCards);

  // Step 6: Build recommendation
  const recommendation = generateRecommendation(
    rankingResult,
    scoreCards,
    evidencePacks,
    userProfile
  );
  enrichRecommendationWithConnectivity(recommendation, rankingResult.top_pick, connectivityByArea);
  console.log(
    `[buildFinalResponse] ranking city=${citySlug} top=${recommendation.top_pick} top_score=${rankingResult.rankings[0]?.final_score?.toFixed(2) ?? "n/a"} top_has_breakers=${rankingResult.rankings[0]?.has_constraint_breakers ?? false}`,
  );
  for (const card of scoreCards) {
    const penaltyIds = card.penalties.map((p) => p.id).join("|") || "none";
    const breakerReasons = card.constraint_breakers.join(" | ") || "none";
    console.log(
      `[buildFinalResponse] area city=${citySlug} zone=${card.micro_area_name} score=${card.final_score.toFixed(2)} confidence=${card.confidence.toFixed(2)} breakers=${card.constraint_breakers.length} penalty_ids=${penaltyIds} breaker_reasons=${breakerReasons} work=${card.scores.work_environment.toFixed(1)} internet=${card.scores.internet_reliability.toFixed(1)} routine=${card.scores.routine_support.toFixed(1)} friction=${card.scores.walkability_and_friction.toFixed(1)} activity=${card.scores.activity_access.toFixed(1)}`,
    );
  }

  // Step 7: Assemble output
  const candidateMicroAreas: MicroAreaOutput[] = scoreCards.map((card) => {
    const ma = acceptedMicroAreas.find((m) => m.id === card.micro_area_id);
    return {
      name: card.micro_area_name,
      summary: ma?.description ?? "",
      scores: card.scores,
      penalties: card.penalties.map((p) => ({ reason: p.reason, value: p.value })),
      strengths: card.strengths,
      weaknesses: card.weaknesses,
      constraint_breakers: card.constraint_breakers,
      best_for: card.best_for,
      confidence: card.confidence,
      // Spatial data for map rendering
      center: "center" in ma! ? (ma as MicroAreaDef).center : undefined,
      radius_km: "radius_km" in ma! ? (ma as MicroAreaDef).radius_km : undefined,
    };
  });

  const output: FinalOutput = {
    user_profile: userProfile,
    weights,
    candidate_micro_areas: candidateMicroAreas,
    ranking: rankingResult.rankings.map((r) => ({
      rank: r.rank,
      micro_area: r.micro_area_name,
      final_score: r.final_score,
      has_constraint_breakers: r.has_constraint_breakers,
    })),
    recommendation,
    assumptions,
    unknowns,
  };

  // Validate before return — never return invalid output silently
  console.log(
    `[buildFinalResponse] done city=${citySlug} candidate_micro_areas=${output.candidate_micro_areas.length} warnings=${output.recommendation.warnings.length}`,
  );
  return FinalOutputSchema.parse(output);
}

type ConnectivityByArea = Map<
  string,
  {
    summary: ConnectivitySummary;
    starlinkFallback: StarlinkFallback | null;
  }
>;

async function resolveConnectivityByMicroArea(
  citySlug: string,
  microAreas: MicroAreaDef[],
): Promise<ConnectivityByArea> {
  const map: ConnectivityByArea = new Map();
  if (microAreas.length === 0) return map;

  await ensureConnectivityPrecomputedForCitySlug(citySlug).catch(() => null);
  const destination = await connectivityRepository.getDestinationBySlug(citySlug);
  if (!destination) return map;

  const cells = await connectivityRepository.listCellsForDestination(destination.id);
  if (!cells.length) return map;

  const byId = new Map(cells.map((c) => [c.id, c]));
  for (const area of microAreas) {
    let profile = await connectivityRepository.getAreaProfile(destination.id, area.id);

    if (!profile) {
      const nearest = cells
        .slice()
        .sort(
          (a, b) =>
            haversineKm(a.centroidLat, a.centroidLon, area.center.lat, area.center.lon) -
            haversineKm(b.centroidLat, b.centroidLon, area.center.lat, area.center.lon),
        )[0];
      if (nearest) {
        profile = {
          id: `synthetic-${area.id}`,
          destinationId: destination.id,
          areaId: area.id,
          bestCellId: nearest.id,
          summary: buildConnectivitySummary({
            score: nearest.remoteWorkScore,
            bucket: nearest.remoteWorkBucket,
            median_download_mbps: nearest.medianDownloadMbps,
            median_upload_mbps: nearest.medianUploadMbps,
            median_latency_ms: nearest.medianLatencyMs,
            confidence: nearest.confidenceBucket,
            freshness_days: nearest.freshnessDays,
          }),
          starlinkFallback: null,
          computedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    if (!profile) continue;
    let summary: ConnectivitySummary | null = null;
    if (profile.summary && typeof profile.summary === "object") {
      const s = profile.summary as Partial<ConnectivitySummary>;
      if (typeof s.score === "number" && typeof s.bucket === "string") {
        summary = {
          score: s.score,
          bucket: s.bucket,
          median_download_mbps: s.median_download_mbps ?? null,
          median_upload_mbps: s.median_upload_mbps ?? null,
          median_latency_ms: s.median_latency_ms ?? null,
          confidence: s.confidence ?? "low",
          freshness_days: s.freshness_days ?? null,
          summary_short: s.summary_short ?? "",
          summary_long: s.summary_long ?? "",
          warnings: Array.isArray(s.warnings) ? s.warnings : [],
        };
      }
    }
    if (!summary && profile.bestCellId) {
      const cell = byId.get(profile.bestCellId);
      if (cell) {
        summary = buildConnectivitySummary({
          score: cell.remoteWorkScore,
          bucket: cell.remoteWorkBucket,
          median_download_mbps: cell.medianDownloadMbps,
          median_upload_mbps: cell.medianUploadMbps,
          median_latency_ms: cell.medianLatencyMs,
          confidence: cell.confidenceBucket,
          freshness_days: cell.freshnessDays,
        });
      }
    }
    if (!summary) continue;
    if (profile.id.startsWith("synthetic-")) {
      summary.warnings = [
        ...summary.warnings,
        "Used nearest-cell fallback for this area due to sparse local connectivity data.",
      ];
    }
    map.set(area.id, {
      summary,
      starlinkFallback:
        profile.starlinkFallback && typeof profile.starlinkFallback === "object"
          ? (profile.starlinkFallback as StarlinkFallback)
          : null,
    });
  }
  return map;
}

function applyConnectivityToScoreCards(
  cards: ScoreCard[],
  weights: ReturnType<typeof adjustWeights>,
  connectivityByArea: ConnectivityByArea,
): void {
  if (connectivityByArea.size === 0) return;
  for (const card of cards) {
    const context = connectivityByArea.get(card.micro_area_id);
    if (!context) continue;
    const connectivityInternetScore = Math.max(
      0,
      Math.min(10, Number((context.summary.score / 10).toFixed(1))),
    );
    const blendedInternetScore = Number(
      (card.scores.internet_reliability * 0.65 + connectivityInternetScore * 0.35).toFixed(1),
    );
    const delta = blendedInternetScore - card.scores.internet_reliability;
    card.scores.internet_reliability = blendedInternetScore;
    card.scores.weighted_total = Math.max(
      0,
      Math.min(10, Number((card.scores.weighted_total + delta * weights.internet_reliability).toFixed(1))),
    );
    card.final_score = Math.max(
      0,
      Math.min(10, Number((card.final_score + delta * weights.internet_reliability).toFixed(1))),
    );

    if (context.summary.bucket === "excellent" || context.summary.bucket === "good") {
      card.strengths = [
        `Connectivity: ${context.summary.bucket} (${context.summary.score}/100)`,
        ...card.strengths,
      ].slice(0, 4);
    } else if (context.summary.bucket === "risky") {
      card.weaknesses = [
        `Connectivity risk (${context.summary.score}/100)`,
        ...card.weaknesses,
      ].slice(0, 4);
    }
  }
}

function enrichRecommendationWithConnectivity(
  recommendation: FinalOutput["recommendation"],
  topPickId: string,
  connectivityByArea: ConnectivityByArea,
): void {
  const top = connectivityByArea.get(topPickId);
  if (!top) return;

  const topSummary = top.summary;
  if (topSummary.bucket === "excellent" || topSummary.bucket === "good") {
    recommendation.why_it_wins = [
      `Connectivity is ${topSummary.bucket} (${topSummary.score}/100), likely good for calls and deep work.`,
      ...recommendation.why_it_wins,
    ].slice(0, 4);
  } else if (topSummary.bucket === "okay") {
    recommendation.main_tradeoffs = [
      "Connectivity is workable for async work, but heavy call schedules may be inconsistent.",
      ...recommendation.main_tradeoffs,
    ].slice(0, 4);
  } else {
    recommendation.main_tradeoffs = [
      "Connectivity is risky in this area, so internet-reliant workflows need extra caution.",
      ...recommendation.main_tradeoffs,
    ].slice(0, 4);
  }

  if (top.starlinkFallback?.display_label) {
    recommendation.warnings = [
      ...recommendation.warnings,
      `${top.starlinkFallback.display_label}. Do not assume backup solves neighborhood internet quality by itself.`,
    ];
  }

  recommendation.warnings = [...new Set(recommendation.warnings)];
}

// ── Provider resolution (fully dynamic) ───────────────────────────────────────

async function resolveMicroAreas(
  citySlug: string,
  cityName: string,
  country: string,
  mainActivity: string,
): Promise<MicroAreaDef[]> {
  const canonical = await canonicalRepository.getCanonicalDestinationContext(citySlug);
  if (canonical?.microAreas?.length && canonical.microAreas.length >= 2) {
    const anchor =
      canonical.destination.anchorLat != null && canonical.destination.anchorLon != null
        ? { lat: canonical.destination.anchorLat, lon: canonical.destination.anchorLon }
        : null;
    const mapped = canonical.microAreas.map(({ area }) => ({
      id: area.id,
      name: area.canonicalName,
      description:
        area.source ??
        `${area.canonicalName} in ${cityName} — canonical micro-area`,
      center: { lat: area.centerLat, lon: area.centerLon },
      radius_km: area.radiusKm,
      tags: [],
      known_venues: [],
    }));
    const geofenced = anchor ? filterByAnchorDistance(mapped, anchor) : mapped;
    const usable = geofenced.length >= 2 ? geofenced : mapped;

    console.log(
      `[buildFinalResponse] canonical micro-areas hit for ${citySlug} (${usable.length}/${mapped.length} accepted)`,
    );
    return usable;
  }

  console.log(`[buildFinalResponse] discovering micro-areas for ${cityName} via LLM`);
  const discovered = await discoverMicroAreas(cityName, country, mainActivity);
  if (discovered.length === 0) return discovered;
  const aliasMapped = await applyCanonicalAliasMappings(citySlug, discovered);
  const usableDiscovered = aliasMapped.length > 0 ? aliasMapped : discovered;

  // Seed canonical DB in the background for future requests.
  const anchor = computeAnchor(usableDiscovered);
  const destination = await canonicalRepository.upsertDestination({
    slug: citySlug,
    name: cityName,
    country,
    anchorLat: anchor.lat,
    anchorLon: anchor.lon,
  });
  if (!destination) return usableDiscovered;

  void seedCanonicalMicroAreas(destination.id, usableDiscovered);

  return usableDiscovered;
}

async function resolveEvidencePacks(
  citySlug: string,
  cityName: string,
  country: string,
  microAreas: MicroAreaDef[],
): Promise<EvidencePack[]> {
  console.log(`[buildFinalResponse] gathering live evidence for ${microAreas.length} micro-areas`);
  const packs = await Promise.all(
    microAreas.map((m) => gatherEvidenceForMicroArea(m, cityName, country, citySlug))
  );
  return packs.filter((ep): ep is EvidencePack => ep !== null);
}

function filterByAnchorDistance(
  zones: MicroAreaDef[],
  anchor: { lat: number; lon: number },
): MicroAreaDef[] {
  return zones.filter((z) => {
    const d = haversineKm(anchor.lat, anchor.lon, z.center.lat, z.center.lon);
    if (d > MAX_ZONE_DISTANCE_FROM_ANCHOR_KM) {
      console.warn(
        `[buildFinalResponse] rejected zone "${z.name}" by geofence (${d.toFixed(
          1,
        )}km > ${MAX_ZONE_DISTANCE_FROM_ANCHOR_KM}km)`,
      );
      return false;
    }
    return true;
  });
}

function gateMicroAreasByEvidence(
  zones: MicroAreaDef[],
  packs: EvidencePack[],
): {
  acceptedMicroAreas: MicroAreaDef[];
  acceptedEvidencePacks: EvidencePack[];
} {
  const scored = packs.map((pack) => ({
    pack,
    score: evidenceStrengthScore(pack),
  }));
  for (const s of scored) {
    console.log(
      `[buildFinalResponse] evidence_score zone=${s.pack.micro_area_id} score=${s.score.toFixed(2)} confidence=${s.pack.confidence} coworkings=${s.pack.work.coworkings.length} work_cafes=${s.pack.work.work_cafes.length} restaurants=${s.pack.food.restaurants.length} gyms=${s.pack.routine.gym?.found ? 1 : 0}`,
    );
  }
  const accepted = scored.filter((s) => s.score >= MIN_ACCEPTED_EVIDENCE_SCORE);
  if (accepted.length >= 2) {
    const acceptedIds = new Set(accepted.map((s) => s.pack.micro_area_id));
    return {
      acceptedMicroAreas: zones.filter((z) => acceptedIds.has(z.id)),
      acceptedEvidencePacks: packs.filter((p) => acceptedIds.has(p.micro_area_id)),
    };
  }
  // Fallback to all if filters are too strict.
  console.warn(
    `[buildFinalResponse] evidence_gate fallback accepted=${accepted.length}/${scored.length} threshold=${MIN_ACCEPTED_EVIDENCE_SCORE}`,
  );
  return {
    acceptedMicroAreas: zones,
    acceptedEvidencePacks: packs,
  };
}

function evidenceStrengthScore(pack: EvidencePack): number {
  const workSignal =
    (pack.work.coworkings.length > 0 ? 1.5 : 0) +
    (pack.work.work_cafes.length > 0 ? 1 : 0) +
    (pack.work.internet_score_estimate >= 6 ? 0.5 : 0);
  const routineSignal =
    (pack.routine.grocery?.found ? 0.5 : 0) +
    (pack.routine.pharmacy?.found ? 0.5 : 0) +
    (pack.routine.gym?.found ? 0.5 : 0);
  const activitySignal =
    (typeof pack.activity.main_spot_distance_km === "number" ? 0.5 : 0) +
    (pack.activity.main_spot_walkable ? 0.5 : 0);
  const qualitySignal = pack.confidence === "high" ? 0.5 : pack.confidence === "medium" ? 0.25 : 0;
  return workSignal + routineSignal + activitySignal + qualitySignal;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function computeAnchor(zones: MicroAreaDef[]): { lat: number; lon: number } {
  const lat =
    zones.reduce((sum, z) => sum + z.center.lat, 0) / zones.length;
  const lon =
    zones.reduce((sum, z) => sum + z.center.lon, 0) / zones.length;
  return { lat, lon };
}

async function applyCanonicalAliasMappings(
  citySlug: string,
  discovered: MicroAreaDef[],
): Promise<MicroAreaDef[]> {
  const destination = await canonicalRepository.getDestinationBySlug(citySlug);
  if (!destination) return discovered;

  const mapped = await Promise.all(
    discovered.map(async (zone) => {
      const resolved = await canonicalRepository.resolveMicroAreaAlias(
        destination.id,
        zone.name,
      );
      if (!resolved) return zone;
      return {
        ...zone,
        id: resolved.id,
        name: resolved.canonicalName,
        center: { lat: resolved.centerLat, lon: resolved.centerLon },
        radius_km: resolved.radiusKm,
      };
    }),
  );

  const deduped = new Map<string, MicroAreaDef>();
  for (const zone of mapped) {
    if (!deduped.has(zone.id)) deduped.set(zone.id, zone);
  }
  return [...deduped.values()];
}

async function seedCanonicalMicroAreas(
  destinationId: string,
  discovered: MicroAreaDef[],
): Promise<void> {
  try {
    await Promise.all(
      discovered.map(async (zone) => {
        const saved = await canonicalRepository.upsertMicroArea({
          destinationId,
          canonicalName: zone.name,
          slug: toSlug(zone.name),
          centerLat: zone.center.lat,
          centerLon: zone.center.lon,
          radiusKm: zone.radius_km,
          status: "active",
          confidence: 65,
          source: "seeded_from_dynamic_discovery",
          lastVerifiedAt: new Date(),
        });
        if (!saved) return;
        await canonicalRepository.upsertMicroAreaAlias({
          destinationId,
          microAreaId: saved.id,
          aliasName: zone.name,
          normalizedAlias: zone.name.toLowerCase(),
          source: "seeded_from_dynamic_discovery",
          confidence: 70,
        });
      }),
    );
  } catch (err) {
    console.warn(
      `[buildFinalResponse] canonical seeding failed destinationId=${destinationId}: ${formatError(err)}`,
    );
  }
}

/**
 * Maps FinalOutput.recommendation to BestBaseCard's narrativeText shape.
 * Used when the LLM narration fails or is skipped.
 */
export function mapToNarrativeText(
  output: FinalOutput
): { whyItFits: string; dailyRhythm: string; walkingOptions: string; planAround: string; logistics: string } {
  const { recommendation, candidate_micro_areas } = output;
  const winner = candidate_micro_areas.find(
    (m) => m.name === recommendation.top_pick
  );

  return {
    whyItFits: recommendation.why_it_wins.join(" "),
    dailyRhythm: winner?.strengths.slice(0, 2).join(". ") ?? "",
    walkingOptions: winner?.strengths.find((s) => s.toLowerCase().includes("food") || s.toLowerCase().includes("walk")) ?? "",
    planAround: recommendation.main_tradeoffs.join(" "),
    logistics: recommendation.warnings.join(" "),
  };
}
