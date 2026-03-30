/**
 * Full real-flow enrichment test.
 * Run with: npx tsx scripts/test-enrichment.ts
 *
 * Simulates exactly what the city page does when a user lands on:
 *   /city/popoyo?purpose=surf&workStyle=light&dailyBalance=purpose_first
 *
 * Steps (mirrors CityContent in page.tsx):
 *   1. getPlacesWithCache       — KV cache or Overpass live fetch
 *   2. enrichPlaces             — Google Nearby (adds placeIds, ratings, websites)
 *   3. computeBaseCentroid      — work-cluster centroid
 *   4. reverseGeocodeArea       — human-readable base area name
 *   5. getDailyLifeWithCache    — grocery, pharmacy, convenience
 *   6. computeStayFitScore      — deterministic score + red flags
 *   7. getOrGenerateEnrichedNarrative — Phase 1 (Place Details) + Phase 2 (LLM agent)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import type { City, Place, StayIntent } from "../src/types/index.js";
import { getPlacesWithCache, getDailyLifeWithCache } from "../src/lib/placesCache.js";
import { enrichPlaces } from "../src/lib/enrichment.js";
import { computeBaseCentroid, computeStayFitScore } from "../src/lib/scoring.js";
import { haversineKm } from "../src/lib/overpass.js";
import { reverseGeocodeArea } from "../src/lib/geocode.js";
import { getOrGenerateEnrichedNarrative } from "../src/lib/placeEnrichmentAgent.js";

// ── Config ─────────────────────────────────────────────────────────────────────

const CITY: City = {
  name: "Popoyo",
  slug: "popoyo",
  country: "Nicaragua",
  lat: 11.533,
  lon: -85.983,
};

const INTENT: StayIntent = {
  purpose: "surf",
  workStyle: "light",
  dailyBalance: "purpose_first",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function sep(label: string) {
  const line = "═".repeat(60);
  console.log(`\n${line}\n  ${label}\n${line}`);
}

function printPlace(p: Place) {
  const d = p.distanceFromBasekm ?? p.distanceKm;
  const dist = d != null ? (d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`) : "?";
  const g = p.google?.placeId ? "✓G" : "  ";
  const w = p.google?.website ? "✓W" : "  ";
  const r = p.rating ?? p.google?.rating;
  const rating = r ? `★${r}` : "";
  console.log(`  ${g} ${w}  ${p.name} (${p.category}, ${dist}) ${rating}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!googleKey) { console.error("❌ GOOGLE_MAPS_API_KEY not set"); process.exit(1); }
  if (!openaiKey) { console.error("❌ OPENAI_API_KEY not set"); process.exit(1); }

  console.log("🏄 TrustStay — Real Flow Test");
  console.log(`   URL: /city/${CITY.slug}?purpose=${INTENT.purpose}&workStyle=${INTENT.workStyle}&dailyBalance=${INTENT.dailyBalance}`);

  // ── Step 1: Places from KV cache or Overpass ──────────────────────────────

  sep("STEP 1 — getPlacesWithCache (KV → Overpass)");
  const { places: rawPlaces, needsEnrichment } = await getPlacesWithCache(CITY);
  console.log(`Got ${rawPlaces.length} places (needsEnrichment=${needsEnrichment})`);
  if (rawPlaces.length === 0) {
    console.log("⚠  No places found. Overpass may be unavailable or Popoyo has no OSM data.");
    console.log("   The app would still show the city page with zero places.");
  } else {
    rawPlaces.forEach(p => console.log(`  • ${p.name} (${p.category})`));
  }

  // ── Step 2: Google Nearby enrichment ─────────────────────────────────────

  sep("STEP 2 — enrichPlaces (Google Nearby)");
  console.log("Running Google enrichment (adds placeIds, ratings, websites, nearby places)...");
  const enrichedPlaces = await enrichPlaces(rawPlaces, CITY.lat, CITY.lon);

  const withGoogle = enrichedPlaces.filter(p => p.google?.placeId);
  const withWebsite = enrichedPlaces.filter(p => p.google?.website);
  console.log(`\nAfter enrichment: ${enrichedPlaces.length} places`);
  console.log(`  With Google placeId: ${withGoogle.length}`);
  console.log(`  With website URL:    ${withWebsite.length}`);

  if (enrichedPlaces.length === 0) {
    console.log("⚠  Google found no places near Popoyo. This is expected for a very rural surf spot.");
    console.log("   The enrichment agent will still run with zero place data.");
  } else {
    console.log("\nAll enriched places:");
    enrichedPlaces.forEach(p => printPlace(p));
  }

  // ── Step 3: Base centroid + distanceFromBase ──────────────────────────────

  sep("STEP 3 — computeBaseCentroid");
  const baseCentroid = computeBaseCentroid(enrichedPlaces, CITY.lat, CITY.lon);
  if (baseCentroid) {
    console.log(`Centroid: ${baseCentroid.lat.toFixed(5)}, ${baseCentroid.lon.toFixed(5)}`);
  } else {
    console.log("No centroid (< 3 work places found). Using city center as fallback.");
  }

  const places: Place[] = baseCentroid
    ? enrichedPlaces.map(p => ({
        ...p,
        distanceFromBasekm: Math.round(haversineKm(baseCentroid.lat, baseCentroid.lon, p.lat, p.lon) * 10) / 10,
      }))
    : enrichedPlaces;

  // ── Step 4: Reverse geocode area name ────────────────────────────────────

  sep("STEP 4 — reverseGeocodeArea");
  const centroidForGeocode = baseCentroid ?? { lat: CITY.lat, lon: CITY.lon };
  const areaName = await reverseGeocodeArea(centroidForGeocode.lat, centroidForGeocode.lon);
  console.log(`Area name: "${areaName ?? "(not found)"}"`);

  // ── Step 5: Daily-life places ─────────────────────────────────────────────

  sep("STEP 5 — getDailyLifeWithCache (grocery, pharmacy, convenience)");
  const dailyLife = await getDailyLifeWithCache(CITY);
  console.log(`Found ${dailyLife.length} daily-life places:`);
  dailyLife.forEach(p => console.log(`  • ${p.name} (${p.type}, ${p.distanceKm.toFixed(1)}km)`));

  // ── Step 6: Stay-fit score ────────────────────────────────────────────────

  sep("STEP 6 — computeStayFitScore");
  const stayFit = computeStayFitScore(places, dailyLife, CITY, INTENT, areaName ?? undefined);
  console.log(`Score:      ${stayFit.fitScore}/100 (${stayFit.fitLabel})`);
  console.log(`Profile:    ${stayFit.profile}`);
  console.log(`Base area:  ${stayFit.narrativeInputs.baseAreaName}`);
  console.log(`Work infra: ${stayFit.narrativeInputs.workInfrastructureSummary}`);
  console.log(`Daily life: ${stayFit.narrativeInputs.dailyLifeSummary}`);
  console.log(`Purpose:    ${stayFit.narrativeInputs.purposeAccessSummary ?? "none"}`);
  if (stayFit.redFlags.length > 0) {
    console.log(`Red flags:  ${stayFit.redFlags.join(" | ")}`);
  }
  if (stayFit.narrativeInputs.topWorkPlaceNames.length > 0) {
    console.log(`Work spots: ${stayFit.narrativeInputs.topWorkPlaceNames.join(", ")}`);
  }
  if (stayFit.narrativeInputs.topCafeAndFoodNames.length > 0) {
    console.log(`Food/cafes: ${stayFit.narrativeInputs.topCafeAndFoodNames.join(", ")}`);
  }

  // ── Step 7: Enrichment agent ──────────────────────────────────────────────

  sep("STEP 7 — getOrGenerateEnrichedNarrative (Phase 1 + Phase 2)");
  console.log("Running Phase 1 (Google Place Details) + Phase 2 (LLM agent)...");
  console.log("This may take 15-60s on first run (cached on subsequent runs).\n");

  const t0 = Date.now();
  const enrichedResult = await getOrGenerateEnrichedNarrative(
    CITY.slug,
    CITY.name,
    CITY.country,
    stayFit,
    places
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!enrichedResult) {
    console.log("❌ Enrichment agent returned null. Falling back to deterministic copy.");
    console.log("   This is the expected fallback when OpenAI is unavailable or fails.");
    process.exit(0);
  }

  const { narrative, microAreaNarratives } = enrichedResult;

  if (microAreaNarratives) {
    sep("MAP ZONES (from decision engine)");
    microAreaNarratives.forEach((z) => {
      const flag = z.hasConstraintBreakers ? " 🚫" : z.rank === 1 ? " 🏆" : "";
      console.log(`  #${z.rank} ${z.name} — ${z.score.toFixed(1)}/10${flag}`);
    });
  }

  sep(`RESULT — BestBaseCard narrative for ${CITY.name} (${elapsed}s)`);
  console.log("\n📍  WHY IT FITS\n" + narrative.whyItFits);
  console.log("\n📅  DAILY RHYTHM\n" + narrative.dailyRhythm);
  console.log("\n🚶  WALKING OPTIONS\n" + narrative.walkingOptions);
  console.log("\n⚠️   PLAN AROUND\n" + narrative.planAround);
  console.log("\n🛒  LOGISTICS\n" + narrative.logistics);

  console.log("\n───────────────────────────────────────────────────────────");
  console.log("✅ Test complete. This is exactly what a Popoyo surf+light user sees.");
  console.log(`   Run again to see KV cache hit (should be ~instant).\n`);
}

main().catch(err => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
