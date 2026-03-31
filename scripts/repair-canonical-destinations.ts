/**
 * Repair destination name/country fields from canonical slug catalog.
 *
 * Usage:
 *   node -r ./scripts/preload.cjs scripts/repair-canonical-destinations.ts --dry-run
 *   node -r ./scripts/preload.cjs scripts/repair-canonical-destinations.ts --write
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { destinations } from "../src/db/schema.js";
import { listCanonicalDestinationMetas } from "../src/data/activityDestinations.js";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    write: args.includes("--write"),
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const { write, dryRun } = parseArgs();
  const db = getDb();
  if (!db) {
    console.log("[repair] DATABASE_URL missing; canonical DB unavailable.");
    return;
  }
  const apply = write && !dryRun;
  const canonical = listCanonicalDestinationMetas();
  const rows = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      country: destinations.country,
    })
    .from(destinations);

  const dbBySlug = new Map(rows.map((r) => [r.slug, r]));
  const mismatches = canonical
    .map((c) => {
      const current = dbBySlug.get(c.slug);
      if (!current) return null;
      const nameMismatch = current.name !== c.name;
      const countryMismatch = current.country !== c.country;
      if (!nameMismatch && !countryMismatch) return null;
      return {
        id: current.id,
        slug: c.slug,
        fromName: current.name,
        toName: c.name,
        fromCountry: current.country,
        toCountry: c.country,
      };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  console.log(
    `[repair] scanned=${rows.length} catalog=${canonical.length} mismatches=${mismatches.length} mode=${
      apply ? "write" : "dry-run"
    }`,
  );

  for (const row of mismatches) {
    console.log(
      `[repair] ${row.slug}: "${row.fromName}, ${row.fromCountry}" -> "${row.toName}, ${row.toCountry}"`,
    );
    if (!apply) continue;
    await db
      .update(destinations)
      .set({
        name: row.toName,
        country: row.toCountry,
        updatedAt: new Date(),
      })
      .where(eq(destinations.id, row.id));
  }

  console.log(`[repair] ${apply ? "updated" : "would update"} ${mismatches.length} rows.`);
}

main().catch((err) => {
  console.error("repair-canonical-destinations failed:", err);
  process.exit(1);
});

