/**
 * Manual refresh runner by activity.
 *
 * Usage examples:
 *   node -r ./scripts/preload.cjs scripts/manual-refresh-by-activity.ts --activity surf
 *   node -r ./scripts/preload.cjs scripts/manual-refresh-by-activity.ts --activity dive --limit 10
 *   node -r ./scripts/preload.cjs scripts/manual-refresh-by-activity.ts --activity surf --destination popoyo
 *   node -r ./scripts/preload.cjs scripts/manual-refresh-by-activity.ts --activity exploring --dry-run
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import { geocodeCity } from "../src/lib/geocode.js";
import { CITY_INTROS } from "../src/data/cityIntros.js";
import { KNOWN_CITY_SLUGS } from "../src/data/slugs.js";
import { runDestinationRefresh } from "../src/lib/canonicalRefresh.js";

type CliActivity =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first"
  | "exploring"
  | "all";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };
  const has = (flag: string): boolean => args.includes(flag);

  const activity = (get("--activity") ?? "surf") as CliActivity;
  const destination = get("--destination");
  const limitRaw = get("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const dryRun = has("--dry-run");

  return { activity, destination, limit, dryRun };
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getSlugsForActivity(activity: CliActivity): string[] {
  if (activity === "all") return [...KNOWN_CITY_SLUGS];
  if (activity === "exploring") return [...KNOWN_CITY_SLUGS];
  if (activity === "work_first") {
    return Object.entries(CITY_INTROS)
      .filter(([, intro]) => intro.activity === "work")
      .map(([slug]) => slug);
  }
  return Object.entries(CITY_INTROS)
    .filter(([, intro]) => intro.activity === activity)
    .map(([slug]) => slug);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { activity, destination, limit, dryRun } = parseArgs();

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required for refresh.");
    process.exit(1);
  }

  const seedSlugs = destination ? [destination] : getSlugsForActivity(activity);
  const uniqueSlugs = [...new Set(seedSlugs)];
  const targetSlugs = typeof limit === "number" && Number.isFinite(limit)
    ? uniqueSlugs.slice(0, Math.max(0, limit))
    : uniqueSlugs;

  console.log("\n=== Manual activity refresh ===");
  console.log(`activity: ${activity}`);
  console.log(`count: ${targetSlugs.length}`);
  console.log(`dryRun: ${dryRun ? "yes" : "no"}`);
  if (destination) console.log(`destination override: ${destination}`);

  if (targetSlugs.length === 0) {
    console.log("No destinations matched.");
    return;
  }

  const results: Array<{ slug: string; status: "ok" | "skip" | "fail"; detail: string }> = [];

  for (const slug of targetSlugs) {
    const query = slugToName(slug);
    const city = await geocodeCity(query);
    if (!city) {
      results.push({ slug, status: "skip", detail: "geocode_failed" });
      continue;
    }

    if (dryRun) {
      results.push({
        slug,
        status: "ok",
        detail: `would_refresh: ${city.name}, ${city.country}`,
      });
      continue;
    }

    try {
      const output = await runDestinationRefresh({
        citySlug: slug,
        activity: (activity === "all" ? "surf" : activity),
        dryRun: false,
      });
      results.push({
        slug,
        status: "ok",
        detail: `top_pick=${output.topPick}; zones=${output.zones}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ slug, status: "fail", detail: message.slice(0, 180) });
    }

    // Small spacing to avoid burst pressure on providers.
    await sleep(250);
  }

  console.log("\n=== Refresh summary ===");
  const ok = results.filter((r) => r.status === "ok").length;
  const skip = results.filter((r) => r.status === "skip").length;
  const fail = results.filter((r) => r.status === "fail").length;
  console.log(`ok=${ok} skip=${skip} fail=${fail}`);
  for (const row of results) {
    console.log(`- [${row.status}] ${row.slug}: ${row.detail}`);
  }

  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("manual-refresh-by-activity failed:", err);
  process.exit(1);
});

