import OpenAI from "openai";
import type { Place, StayFitResult } from "@/types";
import {
  getStayFitNarrative,
  saveStayFitNarrative,
  type CachedStayFitNarrative,
} from "@/lib/kv";

export interface NarrativeOption {
  baseAreaName: string;
  baseAreaReason: string;
  intro: string;
  summaryText: string;
  activity: "surf" | "dive" | "hike" | "yoga" | "kite" | "work" | null;
  bestMonths: string | null;
}

export interface GenerateNarrativeInput {
  cityName: string;
  citySlug: string;
  country: string;
  routineScore: number;
  workPlaces: Pick<Place, "name" | "category" | "distanceFromBasekm" | "distanceKm">[];
  cafePlaces: Pick<Place, "name" | "category" | "distanceFromBasekm" | "distanceKm">[];
  totalPlaces: number;
  baseCentroidAddress: string | null;
  /** Places confirmed by users recently (from PostHog feedback) */
  confirmedPlaces?: { name: string; confirmCount: number }[];
  /** Places reported as having issues */
  reportedPlaces?: { name: string; issue: string }[];
}

const SYSTEM_PROMPT = `You are a digital nomad who has lived and worked remotely in 40+ cities
across Latin America and the Caribbean over the last 4 years.

You know the specific pain: you've picked the wrong Airbnb — beautiful photos,
wrong neighborhood. 35 minutes from any coworking, noisy at 6am, no café within
walking distance. You've wasted a week of productivity figuring out where to actually work.

You understand what it means to "get functional fast" in a new city:
- Day 1: find where the work cluster is
- Day 2: lock in your café/coworking routine
- Day 3: gym sorted, meal spots mapped
- Week 2: you're working at full capacity

When you recommend a base area, you're not thinking about views or Instagram.
You're thinking: can someone land here, check in, and be productive within 48 hours?

You write honestly and specifically. You never use: "vibrant", "charming", "stunning",
"world-class", "perfect for", "hidden gem", "thriving". You name specific streets,
neighborhoods, breaks, and cafés when you know them. If the data is sparse or the
wifi situation is unreliable, you say so clearly.

You also factor in real user feedback: if several visitors recently confirmed that
a place is still working well, that carries weight. If multiple people reported an
issue with a spot, you mention it or deprioritize it.

Present tense, third person. Max 3 sentences per text block.`;

function buildUserPrompt(input: GenerateNarrativeInput): string {
  const workList = input.workPlaces
    .slice(0, 8)
    .map((p) => {
      const dist = p.distanceFromBasekm ?? p.distanceKm;
      return `  - ${p.name} (${p.category}${dist !== undefined ? `, ${dist}km from base` : ""})`;
    })
    .join("\n");

  const cafeList = input.cafePlaces
    .slice(0, 8)
    .map((p) => {
      const dist = p.distanceFromBasekm ?? p.distanceKm;
      return `  - ${p.name}${dist !== undefined ? ` (${dist}km)` : ""}`;
    })
    .join("\n");

  const confirmedSection =
    input.confirmedPlaces?.length
      ? `\nUser-confirmed places (recently validated by visitors):\n${input.confirmedPlaces
          .map((p) => `  - ${p.name} (confirmed by ${p.confirmCount} ${p.confirmCount === 1 ? "visitor" : "visitors"})`)
          .join("\n")}`
      : "";

  const reportedSection =
    input.reportedPlaces?.length
      ? `\nUser-reported issues:\n${input.reportedPlaces
          .map((p) => `  - ${p.name}: "${p.issue}"`)
          .join("\n")}`
      : "";

  return `City: ${input.cityName}, ${input.country}
Routine score: ${input.routineScore}/100
Total places found nearby: ${input.totalPlaces}
Recommended base area (from geocoding): ${input.baseCentroidAddress ?? "unknown"}

Work spots:
${workList || "  (no work spots found)"}

Cafés and meal spots:
${cafeList || "  (no cafés found)"}
${confirmedSection}
${reportedSection}

Give me TWO different base area options. They should represent genuinely different
choices — different neighborhoods, different trade-offs.

For each option provide:
- baseAreaName: specific neighborhood or area name (max 4 words)
- baseAreaReason: 1 sentence explaining why it's the right base, referencing
  the actual places or the data. If confirmed places are listed, mention them.
- intro: 2-3 sentences, activity-first, naming specific neighborhoods.
  What's the one thing someone needs to know before booking their Airbnb here?
- summaryText: 1-2 sentences about the practical remote-work setup.
- activity: the primary reason people come here (surf/dive/hike/yoga/kite/work/null)
- bestMonths: best months for the primary activity, or null

Only reference place names from the data provided. Do not invent café names.
If data is sparse (fewer than 5 places), acknowledge it honestly in the text.

Respond with JSON only:
{
  "options": [
    {
      "baseAreaName": "...",
      "baseAreaReason": "...",
      "intro": "...",
      "summaryText": "...",
      "activity": "surf" | "dive" | "hike" | "yoga" | "kite" | "work" | null,
      "bestMonths": "..." | null
    },
    { ... }
  ]
}`;
}

export async function generateNarrativeOptions(
  input: GenerateNarrativeInput
): Promise<NarrativeOption[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[narrativeAI] OPENAI_API_KEY not set");
    return null;
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_NARRATIVE_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1200,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const options: NarrativeOption[] = parsed.options ?? [];
    return options.length > 0 ? options : null;
  } catch (err) {
    console.error("[narrativeAI] OpenAI call failed:", err);
    return null;
  }
}

// ── Stay-fit narrative ────────────────────────────────────────────────────────
// Profile-specific "why it fits" + "plan around" text for BestBaseCard.
// Generated from structured narrativeInputs — the LLM explains, never decides.
// Cached in KV keyed by city-slug:purpose:workStyle (30-day TTL).

export interface StayFitNarrative {
  /** 2–3 sentences: why this base area works for this person's stay. Always mentions purpose. */
  whyItFits: string;
  /**
   * 2 sentences: what a realistic work day looks like from this base.
   * Reference actual place names. Describe morning, work block, and how purpose fits in.
   */
  dailyRhythm: string;
  /**
   * 1–2 sentences: what's actually walkable from this base for food, coffee, or daily needs.
   * Name specific places and honest distances. If nothing walkable, say so.
   */
  walkingOptions: string;
  /** 1–2 sentences: what to prepare for / plan around. Must align with red flags. */
  planAround: string;
  /**
   * 1 sentence: the honest grocery/pharmacy/transport reality.
   * E.g. "Grocery needs a scooter (1.7km). No pharmacy close — stock up before arriving."
   */
  logistics: string;
}

const STAY_FIT_SYSTEM_PROMPT = `You are a stay preparation advisor. You help remote workers prepare for a specific stay in a specific place.
You receive structured place data and write five honest, practical outputs based ONLY on that data.

CRITICAL RULES:
1. ALWAYS mention the person's stated purpose (surf, dive, hike, etc.) — even when daily balance is work-first.
   A surfer with work-first balance is still a surfer who works. Never write as if they only came to work.
2. Only use place names that appear in the data provided. Never invent cafes, spots, or distances.
3. Be specific and actionable. "Walk to X for coffee" is better than "there are café options nearby."
4. Distances matter. If the nearest food is 2km away, say so honestly — don't soften it.
5. Never use: "vibrant", "charming", "stunning", "perfect", "ideal", "hidden gem", "world-class", "great option".

OUTPUT — five fields, all required:

"whyItFits": 2–3 sentences. Why this base area works for this person's specific stay.
  Always address their purpose first, then work infrastructure.
  daily balance adjusts order: purpose_first = activity leads; work_first = 1 sentence activity, then work; balanced = equal weight.

"dailyRhythm": 2 sentences. What a realistic day from this base looks like.
  Name actual work spots. Describe how purpose (surf/hike/etc.) and work blocks fit together.
  Example: "Morning surf at [break/spot]. Work 9–1 at [coworking name]. Lunch at [café]. Afternoon session."
  If no surf/hike/etc. context, describe the work day + breaks realistically.

"walkingOptions": 1–2 sentences. What is actually walkable from this base for food and coffee.
  Name specific places and their distances. Be honest: if nothing is walkable, say so.
  Example: "Algo Rico Cafe is 300m — the main walkable option. The market is a 15-minute scooter ride."

"planAround": 1–2 sentences. What to prepare for or verify before arriving.
  Must not soften or contradict activeRedFlags. If wifi is flagged — say verify wifi.
  If no red flags, give an honest practical note about what to sort before day 1.

"logistics": 1 sentence. The grocery/pharmacy/transport reality, honest and direct.
  Example: "Grocery requires a scooter (1.7km minimum); no pharmacy within easy reach — stock up before arriving."
  If daily life is well covered: say so briefly.

Respond with valid JSON only: { "whyItFits": "...", "dailyRhythm": "...", "walkingOptions": "...", "planAround": "...", "logistics": "..." }`;

function buildStayFitUserPrompt(
  inputs: StayFitResult["narrativeInputs"],
  cityName: string,
  country: string
): string {
  const profileLabel: Record<string, string> = {
    activity_light_work: `${inputs.purpose} + light remote work`,
    activity_balanced_work: `${inputs.purpose} + balanced remote work`,
    work_primary: "heavy remote work (work-primary base)",
    generic: "general stay",
  };

  const balanceLabel: Record<string, string> = {
    purpose_first: "purpose-first — activity shapes the days, work fits around it",
    balanced: "balanced — activity and work matter equally",
    work_first: "work-first — base must protect work hours, but purpose still matters",
  };

  const flagsText =
    inputs.activeRedFlags.length > 0
      ? inputs.activeRedFlags.map((f) => `  - ${f}`).join("\n")
      : "  none";

  const workPlacesText =
    inputs.topWorkPlaceNames.length > 0
      ? inputs.topWorkPlaceNames.join("\n  ")
      : "  none found";

  const cafeAndFoodText =
    inputs.topCafeAndFoodNames.length > 0
      ? inputs.topCafeAndFoodNames.join("\n  ")
      : "  none found nearby";

  const dailyLifeText =
    inputs.dailyLifeDetails.length > 0
      ? inputs.dailyLifeDetails.join("\n  ")
      : "  none found nearby";

  const balance = inputs.dailyBalance ?? "balanced";

  const purposeDisplay =
    inputs.purpose === "work_first"
      ? "focused remote work (no specific activity)"
      : inputs.purpose === "exploring"
      ? "exploring / flexible stay"
      : inputs.purpose;

  return `CITY: ${cityName}, ${country}
BASE AREA: ${inputs.baseAreaName}

PURPOSE (why they came): ${purposeDisplay}
Work intensity: ${inputs.workStyle}
Daily balance: ${balanceLabel[balance] ?? balance}
Scoring profile: ${profileLabel[inputs.profile] ?? inputs.profile}

Work infrastructure summary: ${inputs.workInfrastructureSummary}
Daily life summary: ${inputs.dailyLifeSummary}

WORK SPOTS (coworkings + work cafes, use ONLY these names):
  ${workPlacesText}

CAFES AND FOOD NEARBY (use ONLY these names and distances):
  ${cafeAndFoodText}

DAILY LIFE ESSENTIALS (grocery, pharmacy, etc. — use ONLY these):
  ${dailyLifeText}

RED FLAGS (do NOT soften or contradict):
${flagsText}

Write all five fields for this person preparing their stay in ${cityName}.
PURPOSE IS "${purposeDisplay}" — always address it, even when daily balance is work-first.
Use ONLY the place names listed above. Do not invent any place names, distances, or details.`;
}

/**
 * Generate a stay-fit narrative using the LLM.
 * Returns null if OpenAI is not configured or the call fails.
 * Caller is responsible for caching the result.
 */
async function generateStayFitNarrative(
  inputs: StayFitResult["narrativeInputs"],
  cityName: string,
  country: string
): Promise<StayFitNarrative | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[narrativeAI] OPENAI_API_KEY not set — skipping stay-fit narrative");
    return null;
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_NARRATIVE_MODEL ?? "gpt-4o",
      messages: [
        { role: "system", content: STAY_FIT_SYSTEM_PROMPT },
        { role: "user", content: buildStayFitUserPrompt(inputs, cityName, country) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed.whyItFits !== "string" ||
      typeof parsed.planAround !== "string"
    ) {
      console.warn("[narrativeAI] Stay-fit response missing expected keys:", parsed);
      return null;
    }

    return {
      whyItFits:      parsed.whyItFits.trim(),
      dailyRhythm:    typeof parsed.dailyRhythm === "string" ? parsed.dailyRhythm.trim() : "",
      walkingOptions: typeof parsed.walkingOptions === "string" ? parsed.walkingOptions.trim() : "",
      planAround:     parsed.planAround.trim(),
      logistics:      typeof parsed.logistics === "string" ? parsed.logistics.trim() : "",
    };
  } catch (err) {
    console.error("[narrativeAI] Stay-fit generation failed:", err);
    return null;
  }
}

/**
 * Get a cached stay-fit narrative from KV, or generate one with the LLM on a miss.
 * Returns null if neither KV nor LLM is available — caller falls back to deterministic output.
 */
export async function getOrGenerateStayFitNarrative(
  stayFit: StayFitResult,
  citySlug: string,
  cityName: string,
  country: string
): Promise<StayFitNarrative | null> {
  const { purpose, workStyle, dailyBalance } = stayFit.narrativeInputs;
  const balance = dailyBalance ?? "balanced";

  // 1. KV cache hit → instant return
  const cached = await getStayFitNarrative(citySlug, purpose, workStyle, balance);
  if (cached) {
    console.log(`[narrativeAI] stay-fit KV hit: ${citySlug}:${purpose}:${workStyle}:${balance}`);
    return {
      whyItFits:      cached.whyItFits,
      dailyRhythm:    cached.dailyRhythm    ?? "",
      walkingOptions: cached.walkingOptions ?? "",
      planAround:     cached.planAround,
      logistics:      cached.logistics      ?? "",
    };
  }

  // 2. Cache miss → LLM generation
  console.log(`[narrativeAI] stay-fit KV miss: ${citySlug}:${purpose}:${workStyle}:${balance} — calling LLM`);
  const narrative = await generateStayFitNarrative(
    stayFit.narrativeInputs,
    cityName,
    country
  );
  if (!narrative) return null;

  // 3. Store in KV (fire-and-forget — don't block on save failure)
  const payload: CachedStayFitNarrative = {
    citySlug,
    purpose,
    workStyle,
    dailyBalance: balance,
    whyItFits:      narrative.whyItFits,
    dailyRhythm:    narrative.dailyRhythm,
    walkingOptions: narrative.walkingOptions,
    planAround:     narrative.planAround,
    logistics:      narrative.logistics,
    generatedAt: new Date().toISOString(),
  };
  saveStayFitNarrative(payload).catch((err) =>
    console.warn("[narrativeAI] KV save failed:", err)
  );

  return narrative;
}
