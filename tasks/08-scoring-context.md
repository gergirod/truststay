# Task 08 — Richer Scoring Context

## Objective
Make the routine score and base area card communicate *why* — not just what.
A score of 84/100 is meaningless without context. The base area card needs a
reason, not just a name.

## Problem
- `summaryText` has 4 generic strings (≥70, ≥50, ≥25, <25) that do not reflect
  the actual composition of the city's data. Two cities with score 72 can have
  completely different data profiles and get identical copy.
- `RecommendedAreaCard` shows the area name + a single hardcoded paragraph that
  is the same for every city with medium/high confidence. It does not say why
  that area was chosen.

## Must include

### A. Richer `summaryText` in `scoring.ts`
Replace the 4 static strings with dynamic copy built from real counts:
- Mention specific strengths: "Good café density", "Coworking options available",
  "Gym access nearby", "Multiple food options"
- Mention specific gaps: "No coworkings found", "Limited gym options",
  "Few food spots in this area"
- Keep tone honest and non-absolute
- Examples:
  - "Good café and coworking density. Gym and food options also well represented."
  - "Solid work infrastructure — several cafés and a coworking nearby. Gym options are limited."
  - "Mostly cafés found in this area. No coworkings or gyms — worth factoring into your setup."
  - "Very limited data. Hard to assess routine support for this city."

### B. `areaReason` field added to `CitySummary` type
New optional field: `areaReason?: string`
- Generated in `computeCitySummary` based on how many places cluster near the centroid
- Examples:
  - "Most work spots and cafés cluster within 500m of this zone."
  - "Coworkings and several work-friendly cafés are within walking distance."
  - "Based on available data — coverage for this city is limited."
- Low confidence: "Limited place data. This is a general suggestion — explore from the center."

### C. `RecommendedAreaCard` updated to show `areaReason`
- If `summary.areaReason` is present, replace the current hardcoded paragraph
- If absent, keep current fallback text
- No redesign — same card, just the text becomes dynamic

## Constraints
- Do not change the score formula — only the text that explains it
- Do not add new UI components
- Keep copy honest — no invented certainty
- `areaReason` is optional in the type — existing code must not break if absent

## Done when
- Two different cities with the same score show different `summaryText` based on
  their actual data composition
- `RecommendedAreaCard` shows a sentence that justifies the area, not a generic paragraph
- All existing tests and build pass
