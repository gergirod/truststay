/**
 * Refresh one destination manually.
 *
 * Usage:
 *   node -r ./scripts/preload.cjs scripts/refresh-destination.ts --destination popoyo --activity surf
 *   node -r ./scripts/preload.cjs scripts/refresh-destination.ts --destination santa-teresa --activity surf --structural
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import { runDestinationRefresh } from "../src/lib/canonicalRefresh.js";

type RefreshActivity =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first"
  | "exploring";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };
  const has = (flag: string): boolean => args.includes(flag);
  const destination = get("--destination");
  const activity = (get("--activity") ?? "surf") as RefreshActivity;
  const structural = has("--structural");
  const dryRun = has("--dry-run");
  return { destination, activity, structural, dryRun };
}

async function main() {
  const { destination, activity, structural, dryRun } = parseArgs();
  if (!destination) {
    console.error("Missing --destination <slug>");
    process.exit(1);
  }
  const result = await runDestinationRefresh({
    citySlug: destination,
    activity,
    structural,
    dryRun,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("refresh-destination failed:", err);
  process.exit(1);
});

