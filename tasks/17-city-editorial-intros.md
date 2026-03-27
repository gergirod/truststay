# Task 17 — City Editorial Intros

## Objective
Add a short, honest, activity-first editorial paragraph to each curated city page.
This is the content that earns organic search rankings and differentiates the product
from Nomadlist, Google, and generic "best neighborhoods in X" articles.

## Problem
- `/city/puerto-escondido` currently generates a dynamic page with no static text content
- Google can't rank a page that has no editorial content — just data cards
- Competitors (Nomadlist, Teleport) have city-level pages but zero neighborhood-level context
- Users landing cold from search have no orientation — they go straight to a neighborhood grid
  with no explanation of why this city is on Truststay or what the activity context is

## Must include

### A. `CITY_INTROS` data structure
Create `src/data/cityIntros.ts`:

```ts
export interface CityIntro {
  /** 1–3 sentences. Honest, specific, activity-first. No hype. */
  summary: string;
  /** Optional: primary activity context for this city */
  activity?: "surf" | "dive" | "hike" | "yoga" | "kite" | "work";
  /** Optional: best months to visit for the primary activity */
  bestMonths?: string;
}

export const CITY_INTROS: Record<string, CityIntro> = {
  "puerto-escondido": {
    summary: "Puerto Escondido splits into three zones. La Punta is the working surfer neighborhood — walk to Zicatela, walk to the better cafés. Zicatela is louder and more party-focused. Most people who regret their Airbnb picked it for the vibe and paid for it at 6am.",
    activity: "surf",
    bestMonths: "Apr – Oct (big swells)",
  },
  "nosara": {
    summary: "Nosara is one of the few surf towns where the work-from-anywhere setup actually functions. Guiones has the break and the most café density. Pelada is quieter, better for yoga. The wifi situation has improved significantly in the last two years.",
    activity: "surf",
    bestMonths: "Dec – Apr (dry season)",
  },
  // ... more entries below
};
```

Populate entries for the top 30–40 most-searched destinations first. Prioritize cities that
already have curated neighborhoods (Buenos Aires, Medellín, Lago Atitlán, etc.) and high-traffic
activity towns (Puerto Escondido, Roatán, Bariloche, El Chaltén, etc.).

### B. Editorial intro component
A simple `<CityIntro>` component that renders the summary paragraph above the neighborhood grid
(or above the place list for single-neighborhood cities).

Layout:
- Rendered server-side (no "use client")
- 2–3 lines max visible, no truncation — editorial copy should be short by design
- Subtle left border accent in teal — not a card, not a banner
- If `bestMonths` is set, show it as a small metadata line: `Best for [activity]: [months]`
- If no intro exists for the slug, renders nothing (graceful absence)

### C. Placement in city page
In `src/app/city/[slug]/page.tsx`, pass `cityIntro` to `CityContent`:
```tsx
const intro = CITY_INTROS[slug] ?? null;
// pass to CityContent as prop
```

Render `<CityIntro intro={intro} />` between the city title/summary card and the
neighborhood grid (or place sections for single-neighborhood cities).

### D. Content guidelines (for writing the intros)
These are internal rules for writing each entry. Put them as a comment at the top of
`cityIntros.ts`:

```
WRITING RULES:
- Max 3 sentences. No fluff. Every sentence must answer: "which neighborhood and why?"
- Never use: "vibrant", "charming", "stunning", "world-class", "perfect for"
- Always specific: name the neighborhoods, the breaks, the streets, the issue
- Activity-first: the first sentence should name the activity or why people go there
- Honest about limitations: mention wifi issues, noise, crowds, seasonality if relevant
- Third person, present tense
```

### E. SEO impact
Each `CityIntro` is static, server-rendered text that search engines index.
Verify that the intro text is included in the page's rendered HTML (not client-side only).

Update city page metadata to include the intro summary in `og:description` if present:
```ts
description: intro?.summary ?? `Find the best neighborhood in ${cityName} for remote workers.`
```

## Constraints
- Do not generate intros with AI and publish them unreviewed — every entry must be human-written
  and factually verified before it goes in the file
- Max 3 sentences per intro — enforce via TypeScript or a lint comment rule
- Do not add intros for cities with no curated neighborhoods or very limited data
  (they are auto-discovered; an intro would promise more than the product delivers)
- The component must render nothing if no intro exists — never show a placeholder

## Done when
- `src/data/cityIntros.ts` exists with at least 15 entries
- `<CityIntro>` component renders correctly on city pages that have an entry
- Pages without an entry render identically to before (no visible change)
- Server-rendered HTML includes the intro text (verify with `curl` or View Source)
- `og:description` uses the intro summary when available
- Build and lint pass cleanly
