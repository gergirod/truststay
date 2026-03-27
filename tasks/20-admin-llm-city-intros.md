# Task 20 — Admin: Generate City Intros with AI

## Objective
Add an AI-assisted city intro generator to the admin panel.
Admins input a city slug → the tool calls GPT-4o → outputs a ready-to-paste
TypeScript entry for `src/data/cityIntros.ts`. Reviewed and approved by a human
before it goes live. Zero impact on public page performance.

## Problem
- Writing intros manually takes 5–10 minutes per city
- We have 250+ destinations but only 35 intros today
- Scaling coverage requires a faster authoring loop
- The LLM knows neighborhoods, surf breaks, dive sites, local context by city

## Must include

### A. Admin UI: "City Intros" section
New collapsible section in `/admin` (after Suggested Places):

- Heading: "City intro generator"
- Input: city name (free text) + slug (auto-generated from name, editable)
- Optional: activity selector (surf / dive / hike / yoga / kite / work / auto)
- Button: "Generate with AI"
- Output: textarea showing the generated intro + a formatted TypeScript snippet
- Button: "Copy TypeScript" — copies the entry formatted for `cityIntros.ts`
- Show existing intro if `CITY_INTROS[slug]` already has an entry (with a warning
  "This city already has an intro — generating will overwrite it in the file")

### B. API route `POST /api/admin/generate-intro`
Request body:
```json
{
  "cityName": string,
  "citySlug": string,
  "activity": "surf" | "dive" | "hike" | "yoga" | "kite" | "work" | "auto" | null,
  "secret": string
}
```

Server-side:
1. Validates admin secret
2. Calls OpenAI `gpt-4o` with a structured prompt (see §C)
3. Parses the JSON response
4. Returns `{ summary, activity, bestMonths }` or `{ error: string }`

Use `OPENAI_API_KEY` from environment. If not set, return `{ error: "not_configured" }`.

### C. Prompt design
```
You are an editor for Truststay, a platform for remote workers choosing neighborhoods.

WRITING RULES (follow exactly):
- Max 3 sentences. No fluff. Every sentence must answer: "which neighborhood and why?"
- Never use: "vibrant", "charming", "stunning", "world-class", "perfect for"
- Always specific: name the neighborhoods, the breaks, the streets, the issue
- Activity-first: first sentence names the activity or why people come
- Honest about limitations: mention wifi issues, noise, crowds, seasonality
- Third person, present tense

Write a city intro for: {cityName}, {country}
Primary activity (if known): {activity}

Respond with JSON only:
{
  "summary": "...",
  "activity": "surf" | "dive" | "hike" | "yoga" | "kite" | "work",
  "bestMonths": "..." | null
}
```

### D. TypeScript output format
After generation, the textarea shows the full TypeScript entry ready to paste:

```ts
  "{slug}": {
    summary:
      "{summary}",
    activity: "{activity}",
    bestMonths: "{bestMonths}",
  },
```

The "Copy TypeScript" button copies this exact string to clipboard.

### E. Batch generation (stretch)
A secondary mode: paste a comma-separated list of city slugs → generates all of them
sequentially → displays each result → "Copy all" button copies the full batch as a
TypeScript object block. Rate-limited to 5 per minute server-side.

## Constraints
- Requires `OPENAI_API_KEY` env var — graceful "not configured" state if absent
- Admin secret required on the API route (same pattern as other admin routes)
- Never auto-publish to `cityIntros.ts` — always requires human review + file edit
- The generated text is a draft, not a final product — make this clear in the UI
- Do not show this section to non-admin users (no public route)

## Done when
- Admin can type a city name and click "Generate with AI"
- The output textarea shows a valid 3-sentence intro
- "Copy TypeScript" copies a correctly formatted entry for `cityIntros.ts`
- API returns `{ error: "not_configured" }` if `OPENAI_API_KEY` is not set
- Build and lint pass cleanly
