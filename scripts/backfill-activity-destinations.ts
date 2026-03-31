/**
 * Backfill canonical micro-areas by activity with quality report.
 *
 * Usage:
 *   node -r ./scripts/preload.cjs scripts/backfill-activity-destinations.ts --activity surf --limit 20 --dry-run
 *   node -r ./scripts/preload.cjs scripts/backfill-activity-destinations.ts --activity dive --write
 */

import { config } from "dotenv";
import { resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import { getDestinationSlugsForActivity } from "../src/data/activityDestinations.js";
import { geocodeDestinationSlug } from "../src/lib/destinationGeocode.js";
import {
  discoverMicroAreas,
  type MicroAreaDef,
} from "../src/application/use-cases/discoverMicroAreas.js";
import { gatherEvidenceForMicroArea } from "../src/infrastructure/providers/gatherEvidence.js";
import { canonicalRepository } from "../src/db/repositories/index.js";

type Activity =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first"
  | "exploring"
  | "all";

const MAX_ZONE_DISTANCE_KM = 22;
const MIN_EVIDENCE_SCORE = 2.5;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };
  const has = (flag: string): boolean => args.includes(flag);
  return {
    activity: (get("--activity") ?? "surf") as Activity,
    limit: Number(get("--limit") ?? "0"),
    write: has("--write"),
    dryRun: has("--dry-run"),
  };
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function evidenceScore(pack: Awaited<ReturnType<typeof gatherEvidenceForMicroArea>>): number {
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
  const qualitySignal =
    pack.confidence === "high" ? 0.5 : pack.confidence === "medium" ? 0.25 : 0;
  return workSignal + routineSignal + activitySignal + qualitySignal;
}

function getTargetSlugs(activity: Activity): string[] {
  return getDestinationSlugsForActivity(activity);
}

async function evaluateDestination(slug: string, activity: Activity, dryRun: boolean) {
  const city = await geocodeDestinationSlug(slug);
  if (!city) {
    return { slug, status: "skip" as const, reason: "geocode_failed" };
  }

  const mainActivity =
    activity === "all" || activity === "work_first" || activity === "exploring"
      ? "surf"
      : activity;

  const discovered = await discoverMicroAreas(city.name, city.country, mainActivity);
  const zoneEvaluations = await Promise.all(
    discovered.map(async (zone) => {
      const distance = haversineKm(city.lat, city.lon, zone.center.lat, zone.center.lon);
      const geofencePass = distance <= MAX_ZONE_DISTANCE_KM;
      const evidence = await gatherEvidenceForMicroArea(
        zone,
        city.name,
        city.country,
        slug,
        !dryRun,
      );
      const score = evidenceScore(evidence);
      const evidencePass = score >= MIN_EVIDENCE_SCORE;
      return {
        zone,
        distanceFromAnchorKm: Number(distance.toFixed(2)),
        geofencePass,
        evidenceScore: Number(score.toFixed(2)),
        evidencePass,
        confidence: evidence.confidence,
        signals: {
          coworkings: evidence.work.coworkings.length,
          workCafes: evidence.work.work_cafes.length,
          gyms: evidence.routine.gym?.found ? 1 : 0,
          grocery: evidence.routine.grocery?.found ? 1 : 0,
          pharmacy: evidence.routine.pharmacy?.found ? 1 : 0,
        },
      };
    }),
  );

  const accepted = zoneEvaluations.filter((z) => z.geofencePass && z.evidencePass);
  return {
    slug,
    status: "ok" as const,
    city: { name: city.name, country: city.country, lat: city.lat, lon: city.lon },
    discoveredCount: discovered.length,
    acceptedCount: accepted.length,
    zones: zoneEvaluations,
  };
}

async function writeAcceptedZones(
  entry: Awaited<ReturnType<typeof evaluateDestination>>,
): Promise<void> {
  if (entry.status !== "ok") return;
  const destination = await canonicalRepository.upsertDestination({
    slug: entry.slug,
    name: entry.city.name,
    country: entry.city.country,
    anchorLat: entry.city.lat,
    anchorLon: entry.city.lon,
  });
  if (!destination) return;

  const accepted = entry.zones.filter((z) => z.geofencePass && z.evidencePass);
  await Promise.all(
    accepted.map(async (z) => {
      const saved = await canonicalRepository.upsertMicroArea({
        destinationId: destination.id,
        canonicalName: z.zone.name,
        slug: toSlug(z.zone.name),
        centerLat: z.zone.center.lat,
        centerLon: z.zone.center.lon,
        radiusKm: z.zone.radius_km,
        status: "active",
        confidence: Math.min(100, Math.round(z.evidenceScore * 20)),
        source: "backfill_quality_gated",
        lastVerifiedAt: new Date(),
      });
      if (!saved) return;
      await canonicalRepository.upsertMicroAreaAlias({
        destinationId: destination.id,
        microAreaId: saved.id,
        aliasName: z.zone.name,
        normalizedAlias: z.zone.name.toLowerCase(),
        source: "backfill_quality_gated",
        confidence: Math.min(100, Math.round(z.evidenceScore * 20)),
      });
    }),
  );
}

async function main() {
  const { activity, limit, write, dryRun } = parseArgs();
  const slugs = getTargetSlugs(activity);
  const target = limit > 0 ? slugs.slice(0, limit) : slugs;

  console.log(`\n=== Backfill by activity ===`);
  console.log(`activity=${activity} targets=${target.length} write=${write} dryRun=${dryRun}`);

  const results = [];
  for (const slug of target) {
    const result = await evaluateDestination(slug, activity, dryRun);
    results.push(result);
    if (write && !dryRun) {
      await writeAcceptedZones(result);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    activity,
    write,
    dryRun,
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    skipped: results.filter((r) => r.status === "skip").length,
    results,
  };

  const dir = resolve(process.cwd(), "reports");
  await mkdir(dir, { recursive: true });
  const path = resolve(
    dir,
    `backfill-${activity}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report written: ${path}`);
}

main().catch((err) => {
  console.error("backfill-activity-destinations failed:", err);
  process.exit(1);
});

