# 005 — Scoring Model

## Dimensions

Each dimension is scored 0–10.

| Dimension | Key | Description |
|-----------|-----|-------------|
| Activity access | `activity_access` | How close and accessible is the main activity (surf break, hiking trail, dive site, etc.) |
| Internet reliability | `internet_reliability` | Quality and reliability of wifi/internet in work spots |
| Work environment | `work_environment` | Quality of coworkings, cafes for work, noise, ergonomics |
| Routine support | `routine_support` | Gym, grocery, pharmacy, predictable daily structure |
| Walkability & friction | `walkability_and_friction` | How much daily life requires transport vs walking |
| Food & coffee | `food_and_coffee` | Quality and variety of food/coffee options nearby |
| Sleep & noise comfort | `sleep_noise_comfort` | Noise environment, sleep quality signals from reviews |
| Budget value | `budget_value` | Value for the price level — not cheapest, but best ratio |
| Vibe match | `vibe_match` | How well the micro-area's character matches user preference |

---

## Default weights

```ts
const DEFAULT_WEIGHTS: DecisionWeights = {
  activity_access:           0.22,
  internet_reliability:      0.20,
  work_environment:          0.14,
  routine_support:           0.14,
  walkability_and_friction:  0.10,
  food_and_coffee:           0.08,
  sleep_noise_comfort:       0.05,
  budget_value:              0.04,
  vibe_match:                0.03,
};
// sum = 1.00
```

**Rationale**:
- Activity comes first (22%) because the user chose this destination for a reason
- Internet is second (20%) because broken internet breaks the entire value proposition
- Work env + routine (14% each) — the core "keep your routine" promise
- Friction (10%) — getting stuff done without a scooter matters more than assumed
- Food/coffee (8%) — non-trivial for long stays
- Sleep (5%), budget (4%), vibe (3%) — real but secondary

---

## Dimension scoring rules

### activity_access (0–10)

| Evidence | Score |
|----------|-------|
| Main activity spot walkable (<500m) | 9–10 |
| Close (<1.5km) but not walkable | 6–8 |
| Accessible by scooter (2–5km) | 4–6 |
| Accessible by car only (>5km) | 2–4 |
| Not accessible / unknown | 0–2 |

Bonus: +1 if multiple activity options (e.g. 3 surf breaks)
Penalty trigger: activity requires car when transport_assumption = unknown

### internet_reliability (0–10)

| Evidence | Score |
|----------|-------|
| Multiple reviews confirming fast wifi + at least 1 coworking | 9–10 |
| Some reviews confirm wifi, coworking nearby | 7–8 |
| Google data exists but wifi unconfirmed | 5–6 |
| No coworking, reviews don't mention wifi | 2–4 |
| Known connectivity problems | 0–2 |

Source weight: review mentions > Google data > editorial summary > no data

### work_environment (0–10)

| Evidence | Score |
|----------|-------|
| Dedicated coworking with known pricing | 9–10 |
| Coliving with in-house workspace | 8–9 |
| High-rated work cafe (reviews confirm laptop-friendly) | 6–8 |
| Basic cafe (not confirmed work-friendly) | 3–5 |
| No work-suitable venue found | 0–2 |

Bonus: +1 for ergonomic setup mentioned in reviews (standing desks, monitors)

### routine_support (0–10)

Composite of:
- Gym: present within 1km → +3, within 2km → +2, not found → 0
- Grocery: walkable (<1km) → +3, nearby (<2km) → +2, far → 0
- Pharmacy: walkable (<1.5km) → +2, nearby (<3km) → +1, not found → 0
- Daily café structure: predictable open hours → +2

Scale the composite to 0–10.

### walkability_and_friction (0–10)

| Evidence | Score |
|----------|-------|
| Activity + work + food all walkable (<1km) | 9–10 |
| Activity + work walkable, food nearby | 7–8 |
| One of the three requires scooter | 5–6 |
| Two require scooter | 3–4 |
| All require scooter/car | 0–2 |

This dimension is particularly important for short stays (<7 days) and when transport_assumption = unknown.

### food_and_coffee (0–10)

| Evidence | Score |
|----------|-------|
| 3+ quality options (<500m), includes laptop-friendly cafe | 8–10 |
| 2 options, at least 1 coffee spot | 6–8 |
| 1–2 food options, limited coffee | 3–5 |
| Very limited, requires going out | 1–3 |
| None found | 0 |

### sleep_noise_comfort (0–10)

Sourced entirely from review signals:
- "quiet", "peaceful", "slept well" → high score
- "noisy at night", "street noise", "parties" → low score
- No signal → 5 (neutral, do not penalize or reward)

### budget_value (0–10)

| Evidence | Score |
|----------|-------|
| Accommodation + daily life clearly within budget | 8–10 |
| Slight stretch, good value for what you get | 6–8 |
| Mid-range, average value | 5 |
| More expensive than expected | 3–5 |
| Premium pricing, difficult for budget | 0–3 |

When `budget_level = null`: use score = 5 (neutral), mark as Unknown.

### vibe_match (0–10)

Match between `preferred_vibe` and micro-area character:
- `social` + surf village → 8–10
- `quiet` + remote beach → 8–10
- Mismatch → 3–5
- No vibe preference → 5 (neutral)

---

## Hard penalties (stop-the-ranking)

These are scored deductions that escalate to `constraint_breakers` and prevent the area from being the top pick (unless all areas have them).

| Penalty ID | Trigger | Deduction | Note |
|-----------|---------|-----------|------|
| `no_work_infra_heavy_work` | `work_mode = heavy` AND no coworking or verified wifi cafe found | −3.0 | Hard |
| `no_gym_when_required` | `routine_needs includes gym` AND no gym within 3km found | −2.5 | Hard |
| `activity_inaccessible_no_transport` | Activity requires car/scooter AND `transport_assumption = unknown` | −2.0 | Hard |
| `no_reliable_wifi_heavy_work` | `work_mode = heavy` AND `internet_reliability < 4` | −2.0 | Hard |

---

## Soft penalties (scoring deductions only)

| Penalty ID | Trigger | Deduction |
|-----------|---------|-----------|
| `no_grocery_walkable` | Grocery requires scooter/car AND `transport_assumption = unknown` | −0.8 |
| `no_pharmacy_nearby` | No pharmacy within 3km | −0.5 |
| `limited_food_options` | Food score < 4 AND stay > 7 days | −0.6 |
| `activity_requires_scooter_unknown_transport` | Activity not walkable AND transport unknown | −0.8 |
| `thin_evidence` | Evidence confidence < 0.4 | −0.5 |
| `strong_activity_poor_work` | `activity_access > 7` AND `work_environment < 4` AND `work_mode != light` | −1.0 |

---

## Confidence score rules

`confidence` in `ScoreCard` is 0.0–1.0:

- Start at 1.0
- −0.2 for each dimension with < 2 evidence sources
- −0.1 for each Unknown item
- −0.1 if accommodation evidence is thin
- Floor at 0.1 (always show something)

BestBaseCard shows a low-confidence disclosure when `confidence < 0.5`.

---

## Heuristic overrides

These are applied after scoring and never override the deterministic result — they only add to `warnings`:

1. **Bundling bonus**: if a coliving provides surf + work + food in one property, add +0.5 to `walkability_and_friction` (not in dimension score but in `strengths`)
2. **Review recency**: if all reviews are > 2 years old, add "Evidence may be outdated" to `warnings`
3. **Seasonal access**: if activity is seasonal and it's off-season, add warning to `warnings`
