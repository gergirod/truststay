import OpenAI from "openai";
import type { Place } from "@/types";

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
