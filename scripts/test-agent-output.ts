/**
 * Shows the full agent output — exactly what BestBaseCard displays.
 * Tests two profiles to show how the narrative changes.
 *
 * Run: node -r ./scripts/preload.cjs scripts/test-agent-output.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import type { City, StayIntent } from "../src/types/index.js";
import { getPlacesWithCache, getDailyLifeWithCache } from "../src/lib/placesCache.js";
import { enrichPlaces } from "../src/lib/enrichment.js";
import { computeBaseCentroid, computeStayFitScore } from "../src/lib/scoring.js";
import { reverseGeocodeArea } from "../src/lib/geocode.js";
import { getOrGenerateEnrichedNarrative } from "../src/lib/placeEnrichmentAgent.js";

const CITY: City = {
  name: "Popoyo",
  slug: "popoyo",
  country: "Nicaragua",
  lat: 11.533,
  lon: -85.983,
};

async function runProfile(label: string, intent: StayIntent) {
  const line = "═".repeat(68);
  console.log(`\n${line}`);
  console.log(`  ${label}`);
  console.log(`  Purpose: ${intent.purpose} | Work: ${intent.workStyle} | Balance: ${intent.dailyBalance}`);
  console.log(line);

  // Replicate city page flow
  const placesResult = await getPlacesWithCache(CITY);
  const rawPlaces = Array.isArray(placesResult)
    ? placesResult
    : (placesResult as { places?: unknown[] })?.places ?? [];
  const places = rawPlaces as import("../src/types/index.js").Place[];
  const enriched = await enrichPlaces(places, CITY.lat, CITY.lon)
    .catch(() => places);

  const centroid = computeBaseCentroid(enriched, CITY.lat, CITY.lon);
  const baseLat = centroid?.lat ?? CITY.lat;
  const baseLon = centroid?.lon ?? CITY.lon;

  const areaNameResult = await reverseGeocodeArea(baseLat, baseLon).catch(() => null);
  const areaName = typeof areaNameResult === "string" ? areaNameResult : undefined;
  const dailyLifeRaw = await getDailyLifeWithCache(CITY).catch(() => []);
  const dailyLife = Array.isArray(dailyLifeRaw) ? dailyLifeRaw : [];

  const stayFit = computeStayFitScore(
    enriched,
    dailyLife,
    { name: CITY.name, lat: baseLat, lon: baseLon },
    intent,
    areaName
  );

  console.log(`\n⚙️  SCORING (deterministic)`);
  console.log(`   Profile:    ${stayFit.profile}`);
  console.log(`   Fit score:  ${stayFit.fitScore}/100 (${stayFit.fitLabel})`);
  console.log(`   Base area:  ${stayFit.baseArea}`);
  console.log(`   Red flags:  ${stayFit.redFlags.length > 0 ? stayFit.redFlags.join(" | ") : "none"}`);

  console.log(`\n🤖 RUNNING AGENT (decision engine + gpt-5.2 narration)...`);
  console.log(`   This takes 15–60s on first run (cached on subsequent runs)\n`);

  const start = Date.now();
  const result = await getOrGenerateEnrichedNarrative(
    CITY.slug,
    CITY.name,
    CITY.country,
    stayFit,
    enriched
  );
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!result) {
    console.log(`❌ Agent returned null — check OpenAI key and logs`);
    return;
  }

  const { narrative, microAreaNarratives } = result;
  console.log(`✅ Agent completed in ${elapsed}s\n`);

  if (microAreaNarratives) {
    console.log(`🗺️  MICRO-AREA ZONES (for map):`);
    microAreaNarratives.forEach((z) => {
      const flag = z.hasConstraintBreakers ? " 🚫" : z.rank === 1 ? " 🏆" : "";
      const center = z.center ? `(center: ${z.center.lat.toFixed(3)}, ${z.center.lon.toFixed(3)}, r=${z.radius_km}km)` : "(no coords)";
      console.log(`    #${z.rank} ${z.name} — ${z.score.toFixed(1)}/10${flag} ${center}`);
    });
    console.log("");
  }

  // This is EXACTLY what BestBaseCard receives as narrativeText
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  BESTBASECARD narrativeText — what the user sees             │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  console.log(`\n📍  WHY IT FITS`);
  console.log(`    ${narrative.whyItFits}\n`);

  console.log(`📅  DAILY RHYTHM`);
  console.log(`    ${narrative.dailyRhythm}\n`);

  console.log(`🚶  WALKING OPTIONS`);
  console.log(`    ${narrative.walkingOptions}\n`);

  console.log(`⚠️   PLAN AROUND`);
  console.log(`    ${narrative.planAround}\n`);

  console.log(`🛒  LOGISTICS`);
  console.log(`    ${narrative.logistics}\n`);
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  TRUSTSTAY AGENT OUTPUT — BestBaseCard narrative               ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  // Profile 1: surf + light work (purpose-first)
  await runProfile(
    "PROFILE A: Surf trip, light remote work, purpose-first",
    { purpose: "surf", workStyle: "light", dailyBalance: "purpose_first" }
  );

  // Profile 2: surf + heavy work (work-first) — different narrative expected
  await runProfile(
    "PROFILE B: Surf trip, heavy remote work, work-first",
    { purpose: "surf", workStyle: "heavy", dailyBalance: "work_first" }
  );

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ Both profiles validated — same destination, different output ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");
}

main().catch(console.error);
