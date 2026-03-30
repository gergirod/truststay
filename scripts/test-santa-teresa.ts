/**
 * Tests the dynamic discovery pipeline for Santa Teresa, Costa Rica.
 * No fixtures — LLM discovers micro-areas, Google Places gathers evidence.
 *
 * Run: node -r ./scripts/preload.cjs scripts/test-santa-teresa.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { buildFinalResponse } from "../src/application/use-cases/buildFinalResponse.js";
import type { UserProfile } from "../src/schemas/zod/userProfile.schema.js";

const surfHeavyWork: UserProfile = {
  destination: "Santa Teresa, Costa Rica",
  duration_days: 14,
  main_activity: "surf",
  work_mode: "heavy",
  daily_balance: "work_first",
  routine_needs: ["gym", "laptop_cafe"],
  budget_level: "mid_range",
  preferred_vibe: "social",
  transport_assumption: "scooter",
  hard_constraints: [],
};

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  SANTA TERESA — Dynamic Discovery Test                           ║");
  console.log("║  No fixtures. LLM discovers micro-areas, Google gathers evidence ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝\n");

  const start = Date.now();

  try {
    const output = await buildFinalResponse({
      citySlug: "santa-teresa",
      cityName: "Santa Teresa",
      country: "Costa Rica",
      userProfile: surfHeavyWork,
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✅ Pipeline completed in ${elapsed}s\n`);

    console.log("═".repeat(60));
    console.log("  MICRO-AREAS DISCOVERED");
    console.log("═".repeat(60));
    output.candidate_micro_areas.forEach((m, i) => {
      console.log(`\n  ${i + 1}. ${m.name}`);
      console.log(`     ${m.summary}`);
      console.log(`     Confidence: ${m.confidence}`);
    });

    console.log("\n" + "═".repeat(60));
    console.log("  RANKING (surf + heavy work + scooter)");
    console.log("═".repeat(60));
    output.ranking.forEach((r) => {
      const flag = r.has_constraint_breakers ? " 🚫 CONSTRAINT BREAKER" : "";
      console.log(`  #${r.rank}  ${r.micro_area.padEnd(30)} ${r.final_score.toFixed(1)}/10${flag}`);
    });

    console.log("\n" + "═".repeat(60));
    console.log("  RECOMMENDATION");
    console.log("═".repeat(60));
    console.log(`\n  Top pick:  ${output.recommendation.top_pick}`);
    console.log(`\n  Why it wins:`);
    output.recommendation.why_it_wins.forEach((r) => console.log(`    • ${r}`));
    console.log(`\n  Main tradeoffs:`);
    output.recommendation.main_tradeoffs.forEach((t) => console.log(`    • ${t}`));
    if (output.recommendation.warnings.length) {
      console.log(`\n  Warnings:`);
      output.recommendation.warnings.forEach((w) => console.log(`    ⚠️  ${w}`));
    }

    console.log("\n" + "═".repeat(60));
    console.log("  DIMENSION SCORES (winner)");
    console.log("═".repeat(60));
    const winner = output.candidate_micro_areas.find(
      (m) => m.name === output.recommendation.top_pick
    );
    if (winner?.scores) {
      Object.entries(winner.scores).forEach(([dim, score]) => {
        const bar = "█".repeat(Math.round((score as number) / 10 * 20)).padEnd(20);
        console.log(`  ${dim.padEnd(32)} ${bar} ${(score as number).toFixed(1)}`);
      });
    }

    if (output.unknowns.length) {
      console.log("\n⚠️  Unknowns:");
      output.unknowns.forEach((u) => console.log(`   - ${u}`));
    }

  } catch (err) {
    console.error("\n❌ Pipeline failed:", err);
    process.exit(1);
  }
}

main();
