/**
 * Place Enrichment Agent
 *
 * A three-tool research agent that prepares a deeply specific BestBaseCard
 * briefing for any destination — including thin ones with no OSM/Nearby data.
 *
 * Phase 1 — Batch fetch:
 *   For every place with a Google placeId, fetch Place Details (reviews, hours,
 *   price level) in parallel. Results stored in KV under enriched-places:{citySlug}.
 *   Shared across all intent combinations; fetched once per city per 30 days.
 *
 * Phase 2 — Research agent (gpt-5.2):
 *   Three tools:
 *     1. searchPlaceByName(query)   → Google Places Text Search. Agent runs
 *                                     discovery queries ("coworking Popoyo Nicaragua",
 *                                     "coliving surf Popoyo") to find venues that
 *                                     Nearby Search missed. No LLM hallucination —
 *                                     only verified Google results.
 *     2. getPlaceDetails(placeId)   → reads from Phase 1 KV cache OR fetches live
 *                                     for newly discovered places.
 *     3. extractWebsiteData(url)    → fetches a place's own website to extract
 *                                     pricing, packages, and amenity details.
 *
 *   Research process:
 *     Step 1 — Discovery: run category searches to find coworkings, colivings,
 *              cafes, surf schools. Critical for thin destinations.
 *     Step 2 — Enrich: get reviews + website data for each found place.
 *     Step 3 — Curate: write honest, specific, review-grounded narrative.
 */

import OpenAI from "openai";
import type { Place } from "@/types";
import type { StayFitResult } from "@/types";
import type { StayFitNarrative } from "@/lib/narrativeAI";
import { fetchPlaceDetails } from "@/lib/googlePlaces";
import type { EnrichedPlaceDetail } from "@/lib/kv";
import {
  getEnrichedPlaces,
  saveEnrichedPlaces,
  getStayFitNarrative,
  saveStayFitNarrative,
} from "@/lib/kv";
import { buildFinalResponse } from "@/application/use-cases/buildFinalResponse";
import type { FinalOutput } from "@/schemas/zod/finalOutput.schema";

// ── Phase 1: Batch fetch ─────────────────────────────────────────────────────

/**
 * Fetch Google Place Details for all places that have a Google placeId.
 * Runs in parallel — typically 20-40 calls per city.
 * Results are stored in KV and reused for all intent combinations.
 */
export async function batchFetchPlaceDetails(
  citySlug: string,
  cityName: string,
  places: Place[]
): Promise<EnrichedPlaceDetail[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[enrichmentAgent] GOOGLE_MAPS_API_KEY not set — skipping batch fetch");
    return [];
  }

  // Check KV cache first
  const cached = await getEnrichedPlaces(citySlug);
  if (cached) {
    console.log(`[enrichmentAgent] enriched-places KV hit: ${citySlug} (${cached.totalFetched} places)`);
    return cached.places;
  }

  // Fetch details for all places that have a Google placeId
  const placesWithIds = places.filter((p) => p.google?.placeId);
  if (placesWithIds.length === 0) {
    console.log(`[enrichmentAgent] no Google placeIds found for ${citySlug}`);
    return [];
  }

  console.log(`[enrichmentAgent] fetching details for ${placesWithIds.length} places in ${citySlug}`);

  const results = await Promise.allSettled(
    placesWithIds.map(async (place) => {
      const details = await fetchPlaceDetails(place.google!.placeId, apiKey);
      if (!details) return null;

      const enriched: EnrichedPlaceDetail = {
        placeId: place.google!.placeId,
        name: place.name,
        category: place.category,
        reviews: details.reviews ?? [],
        openingHours: details.currentOpeningHours?.weekdayDescriptions ?? [],
        editorialSummary: details.editorialSummary?.text,
        priceLevel: details.priceLevel,
        rating: details.rating,
        reviewCount: details.userRatingCount,
        website: details.websiteUri,
        distanceFromBasekm: place.distanceFromBasekm,
      };
      return enriched;
    })
  );

  const enrichedPlaces: EnrichedPlaceDetail[] = results
    .filter((r): r is PromiseFulfilledResult<EnrichedPlaceDetail> =>
      r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);

  // Persist to KV (fire-and-forget)
  saveEnrichedPlaces(citySlug, cityName, enrichedPlaces).catch((err) =>
    console.warn("[enrichmentAgent] KV save failed for enriched-places:", err)
  );

  console.log(`[enrichmentAgent] batch fetch done: ${enrichedPlaces.length}/${placesWithIds.length} places enriched`);
  return enrichedPlaces;
}

// ── Website extraction tool ───────────────────────────────────────────────────
// Fetches a place's own website (URL from Google Places websiteUri) and returns
// readable plain text. No external service or API key needed — uses URLs we
// already have from Google enrichment.

const WEBSITE_FETCH_TIMEOUT_MS = 8000;
/** Max characters of extracted text to send to the LLM (keeps tokens manageable) */
const MAX_EXTRACTED_CHARS = 4000;

function stripHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // Replace block elements with newlines for readability
    .replace(/<\/(p|div|li|tr|h[1-6]|br|section|article)>/gi, "\n")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractWebsiteData(url: string): Promise<string> {
  if (!url || !url.startsWith("http")) {
    return "No valid URL provided.";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBSITE_FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Polite browser-like UA — reduces bot-blocking
        "User-Agent":
          "Mozilla/5.0 (compatible; TrustStay/1.0; +https://truststay.co)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return `Could not fetch ${url} (HTTP ${res.status}).`;
    }

    const html = await res.text();
    const text = stripHtml(html);

    // Return the first MAX_EXTRACTED_CHARS — pricing info is usually above the fold
    return text.slice(0, MAX_EXTRACTED_CHARS) || "Page fetched but no readable content found.";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return `Website timed out after ${WEBSITE_FETCH_TIMEOUT_MS / 1000}s.`;
    }
    return `Could not fetch website: ${msg.slice(0, 100)}`;
  }
}

// ── Google Places Text Search tool ────────────────────────────────────────────
// Lets the agent actively search for venues by keyword+location.
// This is the key tool for thin destinations — it finds coworkings, colivings,
// and cafes that never appeared in the Nearby Search results.

interface TextSearchPlace {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  formattedAddress?: string;
  editorialSummary?: { text?: string };
  priceLevel?: string;
}

export async function searchPlaceByName(query: string): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return "Google Places API not configured.";
  if (!query?.trim()) return "Empty query.";

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.location",
          "places.rating",
          "places.userRatingCount",
          "places.websiteUri",
          "places.formattedAddress",
          "places.editorialSummary",
          "places.priceLevel",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 5,
      }),
    });

    if (!res.ok) return `Search failed: HTTP ${res.status}`;

    const data = (await res.json()) as { places?: TextSearchPlace[] };
    if (!data.places?.length) return `No places found for: "${query}"`;

    return data.places
      .map((p) => {
        const parts = [
          `Name: ${p.displayName?.text ?? "Unknown"}`,
          `PlaceId: ${p.id ?? "none"}`,
          p.rating ? `Rating: ${p.rating} (${p.userRatingCount ?? 0} reviews)` : "Rating: none",
          p.formattedAddress ? `Address: ${p.formattedAddress}` : "",
          p.websiteUri ? `Website: ${p.websiteUri}` : "Website: none",
          p.editorialSummary?.text ? `Description: ${p.editorialSummary.text}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        return parts;
      })
      .join("\n\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
    return `Search error: ${msg}`;
  }
}

// ── Phase 2: Agent synthesis ─────────────────────────────────────────────────

const ENRICHMENT_AGENT_SYSTEM_PROMPT = `You are a destination researcher for TrustStay — a tool that helps remote workers prepare for the place they already chose.

Your job: research a destination deeply using real data, then write a specific, honest preparation briefing.

You have three tools:
1. searchPlaceByName(query) — searches Google Places. Use for DISCOVERY. Returns placeId, rating, website, address.
2. getPlaceDetails(placeId) — returns real reviews, opening hours, price level for a place you found.
3. extractWebsiteData(url) — fetches a place's own website. Use for pricing, packages, class schedules.

═══════════════════════════════════════
RESEARCH PROCESS — follow this in order:
═══════════════════════════════════════

STEP 1 — DISCOVERY (always run this):
Run category + location searches. Be specific with location (city + country):
  - searchPlaceByName("coworking [city] [country]")
  - searchPlaceByName("coliving [city] [country]")
  - searchPlaceByName("cafe wifi work [city] [country]")
  - If purpose is surf: searchPlaceByName("surf hostel [city] [country]"), searchPlaceByName("surf school [city] [country]")
  - If purpose is yoga: searchPlaceByName("yoga studio [city] [country]")
  - If purpose is dive: searchPlaceByName("dive shop [city] [country]")
  - If purpose is hike: searchPlaceByName("hiking base [city] [country]")
Also add places from the provided list that already have placeIds.

STEP 2 — ENRICH:
For each coworking, coliving, cafe, and purpose-relevant venue found in Step 1:
  - Call getPlaceDetails(placeId) to get real reviews and opening hours
  - If it has a website, call extractWebsiteData(url) to find pricing and packages

STEP 3 — CURATE & WRITE:
Use only verified data from Steps 1-2. Write the 5-section narrative.

═══════════════════════════════════════
WRITING RULES:
═══════════════════════════════════════
1. PURPOSE FIRST — surf, yoga, dive etc always shapes the narrative. Work fits around it (unless dailyBalance=work_first).
2. Only name places you found via tools. Never invent cafes, distances, or pricing.
3. Include real pricing when found: "$8/day day pass", "$120/month", "$35/surf lesson", "$40/night coliving"
4. Use review language: if reviewers say "fast wifi", "great for calls", "noisy on weekends" — include it
5. Use real opening hours: "opens at 7am", "closed Tuesdays", "only open Nov–Apr"
6. For thin destinations: be honest. "Limited work infrastructure — plan ahead", "bring a SIM for hotspot backup"
7. Never use: "vibrant", "charming", "perfect", "ideal", "hidden gem", "world-class", "thriving"
8. If you genuinely found nothing useful: say so briefly and give practical alternatives

OUTPUT — JSON with exactly these 5 fields. ALL 5 ARE REQUIRED. NEVER leave a field empty.
If you have no data for a field, write an honest short sentence about the gap. Do not omit.

{
  "whyItFits": "2-3 sentences. WHY this specific base area works for this exact stay. Reference the top-ranked micro-area from the decision engine if available. Name real venues, pricing, and what makes the combination work.",
  "dailyRhythm": "2 sentences. A concrete typical day: morning activity session + work block + specific spots with real hours. Name real places.",
  "walkingOptions": "1-2 sentences. Specific walkable food/coffee by name with honest distance. If nothing walkable, say so and give the real alternative.",
  "planAround": "1-2 sentences. The 1-2 real operational concerns to prepare for: wifi reliability, seasonal access, no pharmacy, scooter needed for groceries. Hard facts only.",
  "logistics": "1 sentence. Grocery/pharmacy/transport reality with honest distances and any transport costs found."
}`;

function formatPlacesForAgent(
  places: Place[],
  enrichedDetails: EnrichedPlaceDetail[]
): string {
  const enrichedByPlaceId = new Map(enrichedDetails.map((e) => [e.placeId, e]));

  return places
    .sort((a, b) => (a.distanceFromBasekm ?? 99) - (b.distanceFromBasekm ?? 99))
    .map((p) => {
      const dist = p.distanceFromBasekm != null
        ? (p.distanceFromBasekm < 1
          ? `${Math.round(p.distanceFromBasekm * 1000)}m`
          : `${p.distanceFromBasekm.toFixed(1)}km`)
        : "?km";
      const rating = p.rating ? ` ★${p.rating}` : "";
      const reviewCount = p.reviewCount ? ` (${p.reviewCount} reviews)` : "";
      const placeId = p.google?.placeId ? ` [placeId: ${p.google.placeId}]` : "";
      return `- ${p.name} (${p.category}, ${dist}${rating}${reviewCount})${placeId}`;
    })
    .join("\n");
}

/**
 * Run the enrichment agent (Phase 2).
 * The LLM uses tools to get real place details and web pricing, then synthesizes
 * a rich BestBaseCard narrative grounded in actual reviews and data.
 */
async function runEnrichmentAgent(
  cityName: string,
  country: string,
  stayFit: StayFitResult,
  places: Place[],
  enrichedDetails: EnrichedPlaceDetail[],
  decisionOutput: FinalOutput | null = null
): Promise<StayFitNarrative | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const enrichedMap = new Map(enrichedDetails.map((e) => [e.placeId, e]));

  const { purpose, workStyle, dailyBalance, baseAreaName, activeRedFlags } =
    stayFit.narrativeInputs;

  const balanceLabel: Record<string, string> = {
    purpose_first: "purpose-first (activity shapes the days)",
    balanced: "balanced (activity and work matter equally)",
    work_first: "work-first (protect work hours, but purpose still matters)",
  };

  const purposeDisplay =
    purpose === "work_first" ? "focused remote work"
    : purpose === "exploring" ? "exploring / flexible"
    : purpose;

  const isThinDestination = places.filter((p) => p.google?.placeId).length < 5;

  // Build decision engine grounding block (structured, deterministic)
  const decisionBlock = decisionOutput
    ? `
═══════════════════════════════════════
DECISION ENGINE ANALYSIS (deterministic scoring — do not contradict this):
═══════════════════════════════════════

MICRO-AREA RANKING:
${decisionOutput.ranking
  .map(
    (r) =>
      `  #${r.rank} ${r.micro_area} — ${r.final_score.toFixed(1)}/10${r.has_constraint_breakers ? " ⚠️ CONSTRAINT BREAKERS" : ""}`
  )
  .join("\n")}

TOP PICK: ${decisionOutput.recommendation.top_pick}

WHY IT WINS (scoring-grounded):
${decisionOutput.recommendation.why_it_wins.map((w) => `  • ${w}`).join("\n")}

TRADEOFFS TO INCLUDE:
${decisionOutput.recommendation.main_tradeoffs.map((t) => `  • ${t}`).join("\n") || "  • None significant"}

HARD WARNINGS (do not omit these):
${decisionOutput.recommendation.warnings.map((w) => `  ⚠️ ${w}`).join("\n") || "  • None"}

WHAT WOULD CHANGE THE PICK:
${decisionOutput.recommendation.what_would_change_the_ranking.map((w) => `  • ${w}`).join("\n")}

ASSUMPTIONS:
${decisionOutput.assumptions.map((a) => `  ↳ ${a}`).join("\n") || "  ↳ None"}

UNKNOWNS TO SURFACE:
${decisionOutput.unknowns.map((u) => `  ? ${u}`).join("\n") || "  ? None"}

PER-AREA SCORES (use to ground your narrative):
${decisionOutput.candidate_micro_areas
  .map(
    (area) =>
      `  ${area.name}: activity=${area.scores.activity_access}/10  internet=${area.scores.internet_reliability}/10  work=${area.scores.work_environment}/10  routine=${area.scores.routine_support}/10  friction=${area.scores.walkability_and_friction}/10  final=${decisionOutput.ranking.find((r) => r.micro_area === area.name)?.final_score.toFixed(1) ?? "?"}/10`
  )
  .join("\n")}
`
    : "";

  const userMessage = `RESEARCH BRIEF
═══════════════════════════════════════
City: ${cityName}, ${country}
Recommended base area: ${baseAreaName}
Stay purpose: ${purposeDisplay}
Work intensity: ${workStyle}
Daily balance: ${balanceLabel[dailyBalance ?? "balanced"] ?? dailyBalance}

RED FLAGS — include these honestly, do not soften:
${activeRedFlags.length > 0 ? activeRedFlags.map((f) => `- ${f}`).join("\n") : "- None detected"}
${decisionBlock}
KNOWN PLACES (from OSM + Google Nearby):
${formatPlacesForAgent(places, enrichedDetails)}
${isThinDestination ? `\n⚠️ THIN DESTINATION — the places list above is sparse. You MUST run discovery searches first.` : ""}

═══════════════════════════════════════
YOUR RESEARCH TASK:
═══════════════════════════════════════

STEP 1 — DISCOVERY (run these searches now):
  searchPlaceByName("coworking ${cityName} ${country}")
  searchPlaceByName("coliving ${cityName} ${country}")
  searchPlaceByName("cafe wifi work ${cityName} ${country}")
${purpose === "surf" ? `  searchPlaceByName("surf hostel ${cityName} ${country}")
  searchPlaceByName("surf school ${cityName} ${country}")` : ""}
${purpose === "yoga" ? `  searchPlaceByName("yoga studio ${cityName} ${country}")` : ""}
${purpose === "dive" ? `  searchPlaceByName("dive shop ${cityName} ${country}")` : ""}
${purpose === "hike" ? `  searchPlaceByName("hiking base lodge ${cityName} ${country}")` : ""}

STEP 2 — ENRICH (for each discovered venue):
  - getPlaceDetails(placeId) — get real reviews and hours
  - extractWebsiteData(website) — get pricing and packages (if website available)

STEP 3 — WRITE the 5-section JSON narrative.
${decisionOutput ? `\nIMPORTANT: Your narrative must be consistent with the decision engine analysis above.
The top pick is ${decisionOutput.recommendation.top_pick}. Ground your narrative in the scoring reasons and evidence.` : ""}
Remember: only use data you found via tools. No hallucinations. Be honest about thin coverage.`;

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "searchPlaceByName",
        description:
          "Search Google Places by keyword + location. ALWAYS run this first for discovery. Find coworkings, colivings, cafes, surf schools, yoga studios that may not be in the provided list. Examples: 'coworking Popoyo Nicaragua', 'coliving surf Tamarindo Costa Rica', 'cafe wifi work Playa del Carmen Mexico'.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query: venue type + city + country. Be specific.",
            },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getPlaceDetails",
        description:
          "Get real reviews, opening hours, price level, and editorial summary for a place. Use the placeId from the provided list OR from searchPlaceByName results.",
        parameters: {
          type: "object",
          properties: {
            placeId: {
              type: "string",
              description: "The Google placeId from the places list or from searchPlaceByName results.",
            },
          },
          required: ["placeId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "extractWebsiteData",
        description:
          "Fetch a place's own website and extract readable text. Use for pricing (coworking day pass/monthly, surf lessons, coliving packages), schedules, and amenity details not in Google Places.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The full website URL from searchPlaceByName or getPlaceDetails results.",
            },
          },
          required: ["url"],
        },
      },
    },
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: ENRICHMENT_AGENT_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  // Tool calling loop — max 30 rounds (discovery phase adds extra steps)
  const MAX_ROUNDS = 30;
  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    rounds++;

    const enrichmentModel = process.env.OPENAI_ENRICHMENT_MODEL ?? "gpt-5.2";

    const response = await client.chat.completions.create({
      model: enrichmentModel,
      messages,
      tools,
      tool_choice: rounds < MAX_ROUNDS ? "auto" : "none",
      temperature: 0.5,
    });

    const message = response.choices[0]?.message;
    if (!message) break;

    messages.push(message);

    // If no tool calls, the agent is done — parse the final narrative
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const raw = message.content;
      if (!raw) break;

      try {
        // Handle JSON wrapped in markdown code blocks
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null;
        const jsonStr = jsonMatch ? jsonMatch[1] : raw;
        const parsed = JSON.parse(jsonStr.trim());

        // Debug: log which fields are empty
        const emptyFields = ["whyItFits","dailyRhythm","walkingOptions","planAround","logistics"]
          .filter(k => !parsed[k]?.trim?.());
        if (emptyFields.length > 0) {
          console.warn(`[enrichmentAgent] empty fields in output: ${emptyFields.join(", ")}`);
        }

        if (typeof parsed.whyItFits !== "string" || typeof parsed.planAround !== "string") {
          console.warn("[enrichmentAgent] agent output missing expected keys");
          break;
        }

        // Fallback: if LLM left a field empty, use decision engine output
        const engineWhy = decisionOutput?.recommendation.why_it_wins.join(" ") ?? "";
        const enginePlan = [
          ...(decisionOutput?.recommendation.main_tradeoffs ?? []),
          ...(decisionOutput?.recommendation.warnings ?? []),
        ].join(" ");
        const whyItFits = parsed.whyItFits.trim() || engineWhy;
        const planAround = parsed.planAround.trim() || enginePlan;

        return {
          whyItFits,
          dailyRhythm:    typeof parsed.dailyRhythm === "string" ? parsed.dailyRhythm.trim() : "",
          walkingOptions: typeof parsed.walkingOptions === "string" ? parsed.walkingOptions.trim() : "",
          planAround,
          logistics:      typeof parsed.logistics === "string" ? parsed.logistics.trim() : "",
        };
      } catch {
        console.warn("[enrichmentAgent] failed to parse agent output:", raw?.slice(0, 200));
        break;
      }
    }

    // Execute tool calls and append results
    const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    for (const toolCall of message.tool_calls) {
      // Only process standard function tool calls
      if (toolCall.type !== "function") continue;

      let result: string;

      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

        if (toolCall.function.name === "searchPlaceByName") {
          result = await searchPlaceByName(args.query as string);
        } else if (toolCall.function.name === "getPlaceDetails") {
          const placeId = args.placeId as string;

          // First try the pre-fetched cache from Phase 1
          let detail = enrichedMap.get(placeId);

          // If not in cache (e.g. newly discovered via searchPlaceByName), fetch live
          if (!detail) {
            const googleApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
            const liveDetail = await fetchPlaceDetails(placeId, googleApiKey);
            if (liveDetail) {
              detail = {
                placeId,
                name: liveDetail.displayName?.text ?? placeId,
                category: "place",
                rating: liveDetail.rating,
                reviewCount: liveDetail.userRatingCount,
                priceLevel: liveDetail.priceLevel,
                openingHours: liveDetail.currentOpeningHours?.weekdayDescriptions ?? [],
                editorialSummary: liveDetail.editorialSummary?.text ?? undefined,
                website: liveDetail.websiteUri ?? undefined,
                reviews: (liveDetail.reviews ?? []).map((r) => ({
                  rating: r.rating,
                  text: r.text,
                  authorName: r.authorName,
                  relativePublishTimeDescription: r.relativePublishTimeDescription,
                })),
              };
            }
          }

          if (detail) {
            const reviewsText =
              detail.reviews.length > 0
                ? detail.reviews
                    .map((r) => `  [${r.rating}★ ${r.relativePublishTimeDescription}] "${r.text.slice(0, 250)}"`)
                    .join("\n")
                : "  No reviews available.";

            result = `Place: ${detail.name} (${detail.category})
Rating: ${detail.rating ?? "n/a"} (${detail.reviewCount ?? 0} reviews)
Price level: ${detail.priceLevel ?? "unknown"}
Opening hours:
${detail.openingHours.map((h) => `  ${h}`).join("\n") || "  Not available"}
Editorial summary: ${detail.editorialSummary ?? "none"}
Website: ${detail.website ?? "none"}
Reviews:
${reviewsText}`;
          } else {
            result = `No details found for placeId: ${placeId}. Try searching for the place name instead.`;
          }
        } else if (toolCall.function.name === "extractWebsiteData") {
          result = await extractWebsiteData(args.url as string);
        } else {
          result = `Unknown tool: ${toolCall.function.name}`;
        }
      } catch {
        result = "Tool call failed — could not parse arguments.";
      }

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    messages.push(...toolResults);
  }

  console.warn(`[enrichmentAgent] agent loop ended without producing output (${rounds} rounds)`);
  return null;
}

// ── Per-micro-area narrative generation ──────────────────────────────────────

export interface MicroAreaNarrative {
  microAreaId: string;
  name: string;
  rank: number;
  score: number;
  hasConstraintBreakers: boolean;
  center?: { lat: number; lon: number };
  radius_km?: number;
  narrativeText: {
    whyItFits: string;
    dailyRhythm: string;
    walkingOptions: string;
    planAround: string;
    logistics: string;
  };
}

/**
 * Generate one short narrative per micro-area in a single LLM call.
 * Returns a ranked array — winner first, constraint-broken areas last.
 */
export async function generateAllMicroAreaNarratives(
  cityName: string,
  country: string,
  decisionOutput: FinalOutput,
  intent: { purpose: string; workStyle: string; dailyBalance?: string },
): Promise<MicroAreaNarrative[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_NARRATIVE_MODEL ?? "gpt-4o-mini";

  const rankingBlock = decisionOutput.ranking
    .map((r) => `#${r.rank} ${r.micro_area} — ${r.final_score.toFixed(1)}/10${r.has_constraint_breakers ? " [CONSTRAINT BREAKER]" : ""}`)
    .join("\n");

  const areasBlock = decisionOutput.candidate_micro_areas.map((m) => {
    const rankEntry = decisionOutput.ranking.find((r) => r.micro_area === m.name);
    const scoreLines = Object.entries(m.scores)
      .filter(([k]) => k !== "weighted_total")
      .map(([k, v]) => `    ${k}: ${(v as number).toFixed(1)}`)
      .join("\n");
    return `
ZONE: ${m.name}
Rank: #${rankEntry?.rank ?? "?"} (${rankEntry?.final_score?.toFixed(1) ?? "?"}/10)
Summary: ${m.summary}
Scores:\n${scoreLines}
Strengths: ${m.strengths.join("; ")}
Weaknesses: ${m.weaknesses.join("; ")}
Constraint breakers: ${m.constraint_breakers.length ? m.constraint_breakers.join("; ") : "none"}
Best for: ${m.best_for.join(", ")}`;
  }).join("\n---\n");

  const prompt = `You are writing BestBaseCard content for a remote-worker travel app.

Destination: ${cityName}, ${country}
Traveler intent: ${intent.purpose} + ${intent.workStyle} work (${intent.dailyBalance ?? "balanced"} balance)

Decision engine output:
RANKING:
${rankingBlock}

ZONES:
${areasBlock}

TOP PICK: ${decisionOutput.recommendation.top_pick}
WHY IT WINS: ${decisionOutput.recommendation.why_it_wins.join("; ")}
TRADEOFFS: ${decisionOutput.recommendation.main_tradeoffs.join("; ")}
WARNINGS: ${decisionOutput.recommendation.warnings.join("; ")}

Write one BestBaseCard narrative per zone. Be specific and honest — use the scoring data above.
For CONSTRAINT BREAKER zones: still write the narrative but make planAround honest about WHY it doesn't work for this profile.
Keep each field to 1-2 sentences max — these are card snippets, not essays.

Return ONLY this JSON array (one object per zone, in rank order):
[
  {
    "name": "Zone Name",
    "whyItFits": "Why this specific zone works (or doesn't) for ${intent.purpose} + ${intent.workStyle} work. Reference real strengths/weaknesses from the data.",
    "dailyRhythm": "A concrete typical day in this zone for this traveler.",
    "walkingOptions": "What's walkable from this zone: work spots, food, activity.",
    "planAround": "The 1-2 real constraints or tradeoffs to prepare for in this zone.",
    "logistics": "Transport and supply-run reality for this zone."
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in response");
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      name: string;
      whyItFits: string;
      dailyRhythm: string;
      walkingOptions: string;
      planAround: string;
      logistics: string;
    }>;

    return decisionOutput.ranking.map((rankEntry) => {
      const zone = decisionOutput.candidate_micro_areas.find((m) => m.name === rankEntry.micro_area);
      const llm = parsed.find((p) => p.name === rankEntry.micro_area) ?? parsed[rankEntry.rank - 1];

      return {
        microAreaId: rankEntry.micro_area.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: rankEntry.micro_area,
        rank: rankEntry.rank,
        score: rankEntry.final_score,
        hasConstraintBreakers: rankEntry.has_constraint_breakers ?? false,
        center: zone?.center,
        radius_km: zone?.radius_km,
        narrativeText: {
          whyItFits: llm?.whyItFits ?? "",
          dailyRhythm: llm?.dailyRhythm ?? "",
          walkingOptions: llm?.walkingOptions ?? "",
          planAround: llm?.planAround ?? (rankEntry.has_constraint_breakers
            ? decisionOutput.recommendation.warnings.find((w) => w.includes(rankEntry.micro_area)) ?? ""
            : ""),
          logistics: llm?.logistics ?? "",
        },
      };
    });
  } catch (err) {
    console.error("[enrichmentAgent] generateAllMicroAreaNarratives failed:", err);
    // Fallback: generate basic narratives from engine data only
    return decisionOutput.ranking.map((rankEntry) => {
      const zone = decisionOutput.candidate_micro_areas.find((m) => m.name === rankEntry.micro_area);
      return {
        microAreaId: rankEntry.micro_area.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: rankEntry.micro_area,
        rank: rankEntry.rank,
        score: rankEntry.final_score,
        hasConstraintBreakers: rankEntry.has_constraint_breakers ?? false,
        center: zone?.center,
        radius_km: zone?.radius_km,
        narrativeText: {
          whyItFits: zone?.strengths.join(". ") ?? "",
          dailyRhythm: "",
          walkingOptions: "",
          planAround: zone?.weaknesses.join(". ") ?? "",
          logistics: "",
        },
      };
    });
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export interface EnrichedNarrativeResult {
  narrative: StayFitNarrative;
  /** Per-micro-area narratives + scores for stacked card display */
  microAreaNarratives: MicroAreaNarrative[] | null;
}

/**
 * Get or generate an enrichment-agent-powered stay-fit narrative.
 * Returns narrative + micro-area zone data for map rendering.
 */
export async function getOrGenerateEnrichedNarrative(
  citySlug: string,
  cityName: string,
  country: string,
  stayFit: StayFitResult,
  places: Place[]
): Promise<EnrichedNarrativeResult | null> {
  const { purpose, workStyle, dailyBalance } = stayFit.narrativeInputs;
  const balance = dailyBalance ?? "balanced";

  // 1. KV hit with enriched flag → instant return (no engine re-run, no map zones from cache)
  const cached = await getStayFitNarrative(citySlug, purpose, workStyle, balance);
  if (cached?.enriched) {
    console.log(`[enrichmentAgent] enriched narrative KV hit: ${citySlug}:${purpose}:${workStyle}:${balance}`);
    return {
      narrative: {
        whyItFits:      cached.whyItFits,
        dailyRhythm:    cached.dailyRhythm ?? "",
        walkingOptions: cached.walkingOptions ?? "",
        planAround:     cached.planAround,
        logistics:      cached.logistics ?? "",
      },
      microAreaNarratives: null, // re-generated on next full run
    };
  }

  // 2. Decision engine — run structured scoring (fixture or dynamic discovery)
  let decisionOutput: FinalOutput | null = null;
  try {
    decisionOutput = await buildFinalResponse({
      citySlug,
      cityName,
      country,
      userProfile: {
        destination: `${cityName}, ${country}`,
        duration_days: null,
        main_activity: purpose as "surf" | "dive" | "hike" | "yoga" | "kite" | "work_first" | "exploring",
        work_mode: workStyle as "light" | "balanced" | "heavy",
        daily_balance: (balance ?? "balanced") as "purpose_first" | "balanced" | "work_first",
        routine_needs: [],
        budget_level: null,
        preferred_vibe: null,
        transport_assumption: "unknown",
        hard_constraints: [],
      },
    });
    console.log(`[enrichmentAgent] decision engine ran: ${decisionOutput.ranking.length} micro-areas, top pick: ${decisionOutput.recommendation.top_pick}`);
  } catch {
    console.warn(`[enrichmentAgent] decision engine unavailable for ${citySlug} — continuing without structured output`);
  }

  // 3. Phase 1 — batch Place Details (cached per city)
  const enrichedDetails = await batchFetchPlaceDetails(citySlug, cityName, places);

  // 4. Phase 2 — agent synthesis grounded by decision engine
  console.log(`[enrichmentAgent] running agent for ${citySlug}:${purpose}:${workStyle}:${balance}`);
  const narrative = await runEnrichmentAgent(
    cityName,
    country,
    stayFit,
    places,
    enrichedDetails,
    decisionOutput
  );

  if (!narrative) {
    console.warn(`[enrichmentAgent] agent failed for ${citySlug} — no narrative produced`);
    return null;
  }

  // 5. Generate per-micro-area narratives for stacked card display
  let microAreaNarratives: MicroAreaNarrative[] | null = null;
  if (decisionOutput) {
    microAreaNarratives = await generateAllMicroAreaNarratives(
      cityName,
      country,
      decisionOutput,
      { purpose, workStyle, dailyBalance: balance },
    ).catch((err) => {
      console.warn("[enrichmentAgent] micro-area narrative generation failed:", err);
      return null;
    });
    console.log(`[enrichmentAgent] generated ${microAreaNarratives?.length ?? 0} micro-area narratives`);
  }

  // 6. Store narrative in KV
  saveStayFitNarrative({
    citySlug,
    purpose,
    workStyle,
    dailyBalance: balance,
    whyItFits:      narrative.whyItFits,
    dailyRhythm:    narrative.dailyRhythm,
    walkingOptions: narrative.walkingOptions,
    planAround:     narrative.planAround,
    logistics:      narrative.logistics,
    generatedAt:    new Date().toISOString(),
    enriched:       true,
  }).catch((err) =>
    console.warn("[enrichmentAgent] KV save failed for enriched narrative:", err)
  );

  return { narrative, microAreaNarratives };
}
