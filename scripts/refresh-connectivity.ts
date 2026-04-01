/**
 * Manual connectivity recompute runner.
 *
 * Usage:
 *   node -r ./scripts/preload.cjs scripts/refresh-connectivity.ts --city popoyo
 *   node -r ./scripts/preload.cjs scripts/refresh-connectivity.ts --activity surf --limit 20
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import { ensureConnectivityPrecomputedForCitySlug } from "../src/lib/connectivity/service.js";
import { getDestinationSlugsForActivity } from "../src/data/activityDestinations.js";

type Activity =
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
  return {
    city: get("--city"),
    activity: (get("--activity") ?? "all") as Activity,
    limit: Number(get("--limit") ?? 0),
  };
}

async function main() {
  const { city, activity, limit } = parseArgs();
  const slugs = city
    ? [city]
    : getDestinationSlugsForActivity(activity === "all" ? "all" : activity);
  const unique = [...new Set(slugs)];
  const target = Number.isFinite(limit) && limit > 0 ? unique.slice(0, Math.floor(limit)) : unique;

  console.log(`Recomputing connectivity for ${target.length} destination(s)...`);
  let ok = 0;
  for (const slug of target) {
    try {
      const result = await ensureConnectivityPrecomputedForCitySlug(slug, {
        forceRecompute: true,
      });
      if (result.ok) ok += 1;
      console.log(`- ${slug}: ok=${result.ok ? "yes" : "no"} cells=${result.cellCount}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`- ${slug}: fail=${message.slice(0, 120)}`);
    }
  }
  console.log(`Done. success=${ok}/${target.length}`);
}

main().catch((err) => {
  console.error("refresh-connectivity failed:", err);
  process.exit(1);
});
