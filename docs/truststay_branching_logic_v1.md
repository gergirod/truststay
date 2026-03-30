# TrustStay — Recommendation Engine Branching Logic v1

**Status:** Product design spec, pre-implementation  
**Version:** v1  
**Scope:** City-level stay fit recommendation engine  

---

## 1. Engine goal

In plain language: **take the same city data and re-score, re-weight, and re-explain it based on who is asking.**

The engine does not invent new places. It does not hallucinate infrastructure. It takes the structured place data TrustStay already has — coworkings, cafés, gyms, food spots, confidence signals, geographic positions — and produces a different recommendation, different score, and different narrative depending on the user's purpose + work style input.

The output must pass this test: **if you show two users — a surfer who works 4 hours a day and a deep-focus remote worker who barely cares about the beach — the recommendations they receive should be meaningfully, visibly different.** Not just in copy. In substance, emphasis, and tradeoff framing.

The engine operates in three layers:

1. **Score layer** — algorithmic re-weighting of existing place signals based on inputs
2. **Highlight layer** — deterministic selection of which places and facts to surface
3. **Narrative layer** — LLM-generated explanation and tradeoffs, grounded in layer 1 and layer 2 outputs

Layers 1 and 2 are computed without AI. Layer 3 uses AI but is strictly grounded in the outputs of layers 1 and 2 — it cannot say anything the data doesn't support.

---

## 2. Personalization dimensions

### Purpose (why are you here)

**Why it matters:** Purpose determines which geographic area and which place types become primary. A surfer needs proximity to a break. A diver needs proximity to a boat dock or dive shop. A hiker needs a quiet staging base. A work-first person needs the densest work infrastructure cluster.

**Influence level:** High — changes which signals are elevated in centroid calculation and which places are highlighted.

**How it acts:** Primarily a **weight modifier** on the centroid + place scoring. Also a **copy modifier** — the narrative and tradeoffs generated are different per purpose.

**OSM data we can use for purpose:**
- Surf → `natural=beach` proximity
- Dive → `amenity=dive_shop`, `leisure=water_sports`
- Hike → `leisure=nature_reserve`, `natural=peak`, `highway=trailhead`
- Yoga → `leisure=sports_centre` + `sport=yoga`, `leisure=yoga`
- Kite → `natural=beach` + wind direction context (limited OSM data)
- Work-first → existing coworking/café cluster (already implemented)

**Honest constraint:** For many surf/dive/hike towns in our dataset, the work infrastructure and the activity hub are already geographically close (La Punta in Puerto Escondido, the main strip in San Juan del Sur). In these cases, purpose primarily affects the narrative and highlight layer, not the geographic recommendation. The engine must be honest when this is the case rather than pretending to differentiate geographically when the data doesn't support it.

---

### Work style (how much does work shape your day)

**Why it matters:** This is the most actionable input for changing the actual score. The existing routine score weights cafés, coworkings, gyms, and food equally. Work style should re-weight those components dramatically.

**Influence level:** High — directly re-calculates the stay fit score with different weights.

**How it acts:** **Filter** (for extreme cases: "work is the main thing" + no coworkings = explicit red flag) + **Weight modifier** (changes score calculation for all three tiers).

Three tiers:
- `"A few hours"` — cafés dominate. Coworking is nice-to-have. Wifi is helpful but not critical.
- `"Half my day"` — both cafés and coworkings matter. Wifi quality is important. Noise awareness starts.
- `"Work is the main thing"` — coworkings are primary. Wifi confidence becomes a hard signal. Noise risk triggers red flags.

---

### Call intensity

**Why it matters:** High call intensity requires quiet, enclosed workspace. An async worker can use any café. A call-heavy worker cannot use a noisy outdoor terrace.

**Influence level:** Medium — does not change the base recommendation but surfaces red flags and affects place ordering within the work section.

**How it acts:** **Copy modifier** + **place re-ranking modifier** within the work section. Cafés with `noiseRisk: "high"` or `noiseRisk: "unknown"` are flagged or de-ranked for call-heavy users. Coworkings with private rooms are elevated.

**v1 decision:** Derive from work style input rather than asking separately. `"Work is the main thing"` implies calls are a likely factor. Use it as a soft proxy. Do not add a fourth input field in v1.

---

### Vibe (what kind of base do you want)

**Why it matters:** Within a recommended area, vibe preference determines which places to highlight and how to frame the neighborhood character. A "local feel" user should not have the same introduction to La Punta as a "social + expat" user.

**Influence level:** Medium — primarily a **copy modifier** and **place ordering modifier**, not a score changer.

**OSM proxies for vibe:**
- Social + expat → higher venue density, English-named places, international-branded spots near recommended centroid
- Local neighborhood feel → residential OSM tags nearby, non-tourist venue names, further from city center
- Quiet + focused → fewer venues per square km, lower noise risk proportion in place list

**v1 decision:** Include as the optional third input field. Use primarily in the narrative layer (LLM uses this to frame the recommendation differently). Limited algorithmic weight in v1 — the data proxies are imprecise.

---

### Stay duration

**Why it matters:** Short stays (under 10 days) prioritize walkability and minimal setup. Long stays (2+ months) should surface grocery access, housing area stability, noise from temporary events. Very long stays shift the value proposition toward local integration.

**Influence level:** Low for the base recommendation. Medium for the secondary output layer (first-week rhythm, logistics notes).

**v1 decision:** Do not include as a main input field. Mention only in the secondary output if it's relevant. Save for v2 persistent profile.

---

### Priorities

**Why it matters:** Users may have specific non-negotiables (food quality, gym access, recovery infrastructure) that override the default weighting.

**Influence level:** Low in v1 — too granular for a 30-second input module.

**v1 decision:** Exclude from input module. Partially derivable from purpose (hike/yoga/kite users implicitly have higher recovery needs). Handle in narrative layer.

---

## 3. Scoring dimensions

These are the dimensions the engine calculates per city, per input combination. Each has a data source and an honest assessment of v1 viability.

### Work infrastructure quality

**What:** How well does this city support serious work? Combines coworking count, café workFit signals, wifi confidence, and noise risk.

**Inputs that affect it:** Work style (primary), call intensity (secondary)

**Formula:**
```
workScore = (
  coworkingCount/threshold × coworkingWeight +
  highWorkFitCafes/threshold × cafeWeight +
  verifiedWifi/totalWork × wifiWeight +
  lowNoisePlaces/totalWork × noiseWeight
)
```

Where `coworkingWeight`, `cafeWeight`, `wifiWeight`, `noiseWeight` change per work style tier.

**v1:** Yes — this is the highest-value algorithmic dimension. The existing `computeCitySummary` already has the components; they just need to be re-weighted per input.

---

### Purpose access score

**What:** How well does this city support the stated activity? Counts relevant OSM-tagged venues within the same geographic cluster as the work centroid.

**Inputs that affect it:** Purpose (primary)

**Per purpose:**
- Surf → count of `natural=beach` nodes within 2km of centroid. Proxy: 0 = none / 1-2 = moderate / 3+ = strong
- Dive → count of `amenity=dive_shop` within 3km
- Hike → count of `leisure=nature_reserve` + `natural=peak` within 5km
- Yoga → count of yoga-tagged venues within 1km of centroid
- Work-first → N/A (work infrastructure score covers this)

**Honest constraint:** OSM coverage for activity-specific tags is inconsistent. Tulum has beaches but OSM may not have them tagged near the work cluster. The engine must handle "no data" gracefully: default to narrative-only output rather than a false score.

**v1:** Yes, but with a low-confidence fallback. If OSM data for the purpose category is sparse, the engine flags this rather than inventing a score.

---

### Noise environment

**What:** How quiet is the work environment in this city? Proportion of work-related places with `noiseRisk: "low"` or `noiseRisk: "medium"`.

**Inputs that affect it:** Work style, call intensity proxy

**v1:** Yes — data already exists in place confidence signals. Used as a red flag trigger for "work is the main thing" users.

---

### Wifi confidence

**What:** Proportion of work places with `wifiConfidence: "verified"` or `wifiConfidence: "medium"`.

**Inputs that affect it:** Work style

**v1:** Yes — data already exists. Used as a hard filter signal for "work is the main thing" users.

---

### Food support

**What:** How convenient is the food situation within the recommended area? Count and distance of food spots from centroid.

**Inputs that affect it:** Work style (higher work intensity → more weight on quick meal proximity), vibe (local feel → de-weight tourist-facing food spots)

**v1:** Yes — partially. Use existing food place count and distance. No vibe-based filtering yet.

---

### Wellbeing / recovery access

**What:** Gym count + distance, yoga studio count. Weighted by how much the user's purpose implies recovery needs.

**Inputs that affect it:** Purpose (hike/yoga/surf → higher weight)

**v1:** Yes — data already exists as gym category. Limited yoga-specific tagging in OSM.

---

### Walkability / cluster tightness

**What:** How close together are the relevant places? A tight cluster means you can walk from work to food to gym. A spread layout means transport is needed.

**Computed as:** Standard deviation of distances of top work places from the centroid. Low variance = tight cluster = high walkability score.

**v1:** Yes — computable from existing `distanceFromBasekm` fields. Simple and high-value signal.

---

### Social fit / vibe match

**What:** Does the character of the recommended area match the user's vibe preference?

**Computed as:** Rough proxy — venue density near centroid, name-pattern signals (English-named = more expat-facing). Very approximate.

**v1:** Partial — use in narrative layer only. Do not expose as a numeric score. Too imprecise for a displayed number.

---

### Red flag severity

**What:** Are there any signals that, for this specific user's input, represent a real problem?

**Computed as:** Rule-based flags (see hard filters below).

**v1:** Yes — deterministic, high value, builds trust.

---

## 4. Hard filters vs weighted fit

### Hard filters

These are binary. If the condition is met, a red flag is shown and the recommendation is qualified or demoted.

| Condition | Triggered by | Output |
|---|---|---|
| 0 coworkings + "work is the main thing" | workStyle + coworkingCount | "No dedicated coworking found — you'll depend entirely on cafés for focused sessions." |
| Wifi confidence < "medium" on all work places + "work is the main thing" | workStyle + wifiConfidence | "Wifi reliability signals are weak across available work spots — call-heavy work may be difficult." |
| purposeAccessScore = 0 (no OSM data for activity) + purpose ≠ work-first | purpose + OSM data | "We couldn't find [surf/dive/hike] infrastructure data for this place — verify locally before committing." |
| Total places < 5 (data too thin to recommend) | placeCount | Low-confidence recommendation with explicit disclaimer |
| All work places have `noiseRisk: "high"` + "work is the main thing" | workStyle + noiseRisk | "Every work spot we found has high noise risk — dedicated quiet workspace doesn't appear to be available." |

### Weighted ranking logic

These influence score and ordering but don't block a recommendation.

| Dimension | "A few hours" | "Half my day" | "Work is the main thing" |
|---|---|---|---|
| Coworking weight | 15% | 35% | 55% |
| High-workFit café weight | 45% | 30% | 20% |
| Wifi confidence weight | 10% | 15% | 15% |
| Food support weight | 20% | 10% | 5% |
| Gym/wellbeing weight | 10% | 10% | 5% |

**Purpose modifier on centroid:** when a purpose-specific venue type is found within the geographic cluster, add weight to that cluster position in the centroid calculation.

```
purposeCentroidBias = 0.25 for surf/hike/dive/yoga
                    = 0.0 for work-first / exploring

centroidWeight(p) = existingWeight(p) + (purposeProximityScore(p) × purposeCentroidBias × totalWeight)
```

This biases the centroid toward the purpose geography when relevant OSM data exists — without overriding the work cluster when it doesn't.

---

## 5. Branching scenarios

### Profile A: Surf + half my day + social base

**Engine behavior:**
- Centroid pulled toward beach proximity if OSM beach data exists
- Coworking weight: 30%, high-workFit cafés: 35%, wifi: 15%
- Vibe: social → highlight high-density venue zone, expat-facing spots
- No hard filters expected for most surf towns

**What rises:** Areas combining beach access with a cluster of work-capable cafés. High-wifi cafés near the main break. Well-rated food spots.

**What gets penalized:** Isolated backpacker hostels far from any café cluster. Spots with wifi unknown.

**Tradeoffs surfaced:** "The area with the best surf access is [X]. The most reliable work cluster is [Y]. They're [distance] apart — you'll make a daily choice between them."

**Red flags:** If no work spots within 1km of beach: "Serious work sessions will mean leaving the surf zone."

---

### Profile B: Hike + work is the main thing + quiet base

**Engine behavior:**
- Coworking weight: 55%, wifi: 20%, noise: critical
- Centroid pulled toward trailhead proximity if OSM data exists, but capped — a quiet coworking near trails beats a beach café far from trails
- Vibe: quiet → de-weight high-density social zones
- Hard filter: noise risk check on all work spots

**What rises:** Coworkings or high-workFit cafés with low noise risk, ideally near hiking access. Gyms or wellness spots (recovery for hikers).

**What gets penalized:** Party-zone locations. Noisy open-terrace cafés. Areas without any coworking.

**Tradeoffs surfaced:** "This base gives you strong wifi and quiet work options. The main trailhead is [X] km — manageable by scooter, less so on foot."

**Red flags:** If the quietest work spots are also the furthest from hike access: flagged explicitly.

---

### Profile C: Deep work + a few hours of activity + quiet base

**Engine behavior:**
- Coworking weight: 50%, wifi: 20%, noise: critical
- Purpose is "work-first" — no activity centroid bias
- Vibe: quiet → penalize high-density social zones
- This is closest to the existing TrustStay recommendation — minimal branching needed

**What rises:** Same as current recommendation but with quiet filter applied. Coworkings first, then high-workFit low-noise cafés.

**What gets penalized:** Beach-adjacent noisy café strips.

**Tradeoffs surfaced:** "This place scores well for dedicated work. Social/entertainment options are limited nearby — may feel quiet for longer stays."

**Red flags:** If all wifi is "unknown": flagged. If no coworking: flagged for "work is the main thing" users.

---

### Profile D: Dive + a few hours + social base

**Engine behavior:**
- Coworking weight: 15%, cafés: 45%, food: 20%
- Centroid biased toward dive shop proximity when OSM data exists
- Vibe: social → highlight high-density zones, expat-facing
- Wifi soft (not critical for "a few hours" + dive primary)

**What rises:** Dive towns where the main strip has both dive operators and decent cafés. Social food scene.

**What gets penalized:** Remote residential areas away from dive infrastructure. Isolated spots with no food scene.

**Tradeoffs surfaced:** "The dive operator cluster is near [area]. The best cafés are [distance] from the marina — quick enough for morning work before an afternoon dive."

**Red flags:** If no dive shops found in OSM: "We couldn't verify dive infrastructure from available data — confirm locally."

---

### Profile E: Trail running + half my day + food priority

**Engine behavior:**
- Purpose → trail/hike infrastructure near centroid
- Work style → balanced (30% café, 35% coworking, 20% food — food elevated beyond default)
- Food support score weighted more heavily than default
- Gym/wellbeing weight elevated (recovery for runners)

**What rises:** Areas with quality food options within walking distance of centroid, plus gym or track nearby. Work backup nearby.

**What gets penalized:** Areas with poor food density or food spots far from work cluster. Noisy party strips (recovery priority).

**Tradeoffs surfaced:** "Good food support near the work cluster. Nearest gym is [X] — worth building into your morning routine."

**Red flags:** If food spots are far from work centroid: "Meal logistics here require planning — no quick-lunch options within walking distance of the work cluster."

---

### Profile F: Short stay + high call intensity + no car

**Engine behavior:**
- Walkability/cluster tightness becomes a hard factor — places must be close together
- Coworking with private room or low noise is critical
- Food within 500m of centroid
- No purpose activity bias — this is pure logistics optimization

**What rises:** The tightest geographic cluster of work + food + basic facilities.

**What gets penalized:** Any recommendation requiring transport. Spread-out place layouts. High-noise work options.

**Tradeoffs surfaced:** "Everything you need is within a tight walkable zone. Trade-off: the main street gets traffic noise during peak hours — mid-morning and late afternoon are quieter."

**Red flags:** If cluster tightness is poor (high variance in distanceFromBasekm): "The useful spots here are spread out — a scooter or regular transport will be necessary even within the area."

---

## 6. City-level recommendation logic

**The unit of recommendation is: a local cluster — not a named neighborhood.**

Named neighborhoods (Palermo, Roma Norte, La Punta) are used when they map cleanly to the centroid. But many cities in TrustStay's coverage — smaller surf towns, diving destinations, hiking bases — don't have recognized neighborhood names. Forcing a "neighborhood" label in these cases creates fake specificity.

The correct unit is: **the cluster of places that fit the user's combination**, described in geographic terms and given a reverse-geocoded label when one exists.

Algorithm:
1. Compute the purpose-weighted centroid (existing `computeBaseCentroid` + purpose bias modifier)
2. Reverse-geocode that centroid to get the best available label (neighborhood → district → area)
3. Identify all places within 800m of that centroid that fit the user's top-weighted categories
4. That cluster is the recommendation unit

The recommendation then reads: *"Your base: [reverse-geocoded label]. [N] work spots + [N] food options within walking distance. [Purpose-specific callout if applicable]."*

If the centroid is unreliable (fewer than 5 qualifying places), the engine falls back to the city center with an explicit confidence qualifier.

---

## 7. Output logic

### Recommended base area

- **Deterministic** — reverse-geocoded label from purpose-weighted centroid
- **Free tier**
- Updates live as inputs change

### Why this fits

- **Deterministic core + LLM wrapper** — the engine computes which signals support the recommendation; the LLM formats one clear sentence grounded in those signals
- **Free tier** — 1 sentence
- **Unlocked** — 2–3 sentences with purpose-specific rationale

### Key tradeoffs

- **Deterministic trigger, LLM language** — rules determine which tradeoffs apply (distance between purpose cluster and work cluster, noise vs activity access, etc.); LLM writes the sentence
- **Unlocked** — 2–3 most relevant tradeoffs for this input combination

### Work backups

- **Deterministic** — top 3 work spots ranked by re-weighted score for this user's work style
- **Partially free** — 1 work spot free, full list unlocked
- Places tagged with purpose relevance if applicable (e.g., "closest to the main break")

### Purpose-related places

- **Deterministic** — places matching the purpose category (dive shops, yoga studios, beaches), ranked by distance from centroid
- **Unlocked**

### Food and recovery support

- **Deterministic** — top food spots and gyms ranked by distance from centroid and user weighting
- **Unlocked**

### Red flags

- **Fully deterministic** — rule-based triggers from hard filter conditions
- **Free tier** — 1 red flag (most severe), full list unlocked
- Trust-building: even the free tier should be honest. Don't hide red flags behind paywall.

### Stay fit score

- **Algorithmic** — weighted sum of work score + purpose score + vibe proxy, all re-calculated per input
- **Free tier** — show the number and a 1-word label (Strong / Moderate / Limited)
- The score is personalized — it says "your fit" not "this city's score"

### A good first week here

- **LLM-generated, strictly grounded** in: centroid address, top work spots, top food spots, purpose venue if found, gym distance
- The LLM cannot reference any place not in the data
- **Unlocked only**
- Format: 3–4 sentences describing a realistic rhythm, not a schedule

---

## 8. Minimum viable engine for v1

The leanest version that produces real branching without fake personalization:

**Step 1: Re-weight the routine score**

Modify `computeCitySummary` to accept a `workStyle` parameter and apply the weight vector from section 4. This produces a different stay fit score for the same city depending on work input. Fully algorithmic, no AI required.

```typescript
function computeStayFitScore(
  places: Place[],
  workStyle: "light" | "balanced" | "heavy"
): number {
  const weights = WORK_STYLE_WEIGHTS[workStyle];
  // same structure as computeCitySummary but with different weights per category
}
```

**Step 2: Compute purpose proximity signal**

For the user's stated purpose, query existing place data for relevant venue types and count proximity to the centroid. Return a simple `purposeAccessLevel: "strong" | "moderate" | "limited" | "unknown"`.

**Step 3: Apply hard filter rules**

Evaluate the filter conditions from section 4 against the place data. Return a `redFlags: string[]` array — each flag is a plain English sentence, generated by rule, not by AI.

**Step 4: Build the LLM prompt**

Pass to the LLM:
- The re-weighted score
- The purpose access level
- The active red flags
- The top 3 work places (names only, no hallucination risk)
- The centroid area name
- The user's input combination

The LLM generates: `whyThisFits` (1 sentence free, 2–3 unlocked), `tradeoffs` (2–3 sentences unlocked), `firstWeekRhythm` (3–4 sentences unlocked).

**Total new components:**
1. `computeStayFitScore(places, workStyle)` — re-weight existing scoring
2. `computePurposeAccess(places, purpose, centroid)` — count relevant venue types
3. `evaluateHardFilters(places, workStyle, purpose)` → `redFlags[]`
4. Updated LLM prompt incorporating inputs 1–3

This is an honest v1 engine. It produces genuinely different outputs for different input combinations because the underlying data is actually re-scored — not just re-worded.

---

## 9. Risks

### Risk 1: Fake branching

**The failure:** Two users with different inputs get the same recommendation because the data for this city only supports one base area. The copy changes but the substance doesn't.

**Why it happens:** Many smaller surf/dive/hike towns have only one viable cluster. There is no second neighborhood to recommend.

**Mitigation:** Be honest. When the data converges to the same recommendation regardless of purpose input, say so. *"For this destination, most stay purposes point to the same base — here's why."* That is also a trusted answer. Don't invent differentiation.

---

### Risk 2: Weak OSM data for purpose categories

**The failure:** The purpose access score for "dive" returns 0 for a well-known dive destination because dive shops aren't tagged in OSM for that city.

**Why it happens:** OSM coverage of activity-specific venues (dive shops, yoga studios, trailheads) is inconsistent and often sparse outside major cities.

**Mitigation:** Always fall back to `purposeAccessLevel: "unknown"` and surface this honestly in the output: *"We couldn't verify [activity] infrastructure from available data — confirm before committing."* This is more trustworthy than a false signal.

---

### Risk 3: Score dimensions become meaningless numbers

**The failure:** The stay fit score changes from 68 to 71 between two input combinations and the user notices it barely changed. The number loses credibility.

**Mitigation:** The score should always be accompanied by a label and a reason. *"Your stay fit: 71 / Moderate — solid café options, no coworking found for your work intensity."* The label and reason carry the meaning; the number is secondary.

---

### Risk 4: The LLM generates plausible-sounding but ungrounded output

**The failure:** The "first week here" narrative mentions a coworking space that doesn't exist in the data, or implies surfing is 5 minutes from the base when the data shows 2km.

**Mitigation:** The LLM prompt must enumerate exactly which places and distances it is allowed to reference. Enforce a strict constraint: *"Only reference places from the following list. Only reference distances that appear in the data."* The prompt structure matters more than the model.

---

### Risk 5: Too many score dimensions confuse the output

**The failure:** The UI shows 6 different scores (work fit, purpose fit, noise, wifi, food, vibe) and the user doesn't know which one to trust.

**Mitigation:** Surface one primary number (stay fit score) with one label and one reason. All sub-dimensions exist internally to power the score but are not individually displayed unless they trigger a red flag.

---

### Risk 6: Thin differences between profiles

**The failure:** The "surf + a few hours" and "surf + half my day" profiles produce nearly identical recommendations because the city has the same work cluster regardless.

**Mitigation:** This is acceptable when data-honest. The red flags and tradeoffs will differ even if the base recommendation converges. A "half my day" user gets a wifi confidence red flag that a "a few hours" user does not. The outputs don't need to diverge on every dimension — only on the dimensions where the data actually justifies divergence.

---

## 10. Final recommendation

### Best v1 branching model

**Two algorithmic layers + one grounded LLM layer.**

Algorithmic layer 1 (score): Re-weight the routine score using the work style weight vectors. This is a code change to `computeCitySummary`. No AI.

Algorithmic layer 2 (highlights + filters): Compute purpose access level from place data. Evaluate hard filter rules. Return red flags as plain English rule-based strings. No AI.

LLM layer (narrative): Pass layers 1 and 2 outputs to the LLM with a strict grounding constraint. Generate `whyThisFits`, `tradeoffs`, `firstWeekRhythm`. The LLM is a formatter of grounded signals, not a source of new information.

### Core scoring dimensions

| Dimension | Algorithmic | v1 |
|---|---|---|
| Work infrastructure quality | Yes | Yes — primary |
| Purpose access level | Yes (with OSM limits) | Yes — with honest fallback |
| Noise environment | Yes | Yes — red flag trigger |
| Wifi confidence | Yes | Yes — red flag trigger |
| Cluster tightness / walkability | Yes | Yes — secondary |
| Food support | Yes | Yes — secondary |
| Vibe match | Partial proxy only | Narrative layer only |

### Minimum set of meaningful branches

Four combinations produce genuinely different outputs:

1. Any purpose + `"work is the main thing"` → coworking-first, noise-sensitive, wifi critical
2. Activity purpose + `"a few hours"` → purpose access primary, work is secondary, relaxed wifi standard
3. Activity purpose + `"half my day"` → balanced, tradeoff between purpose and work explicit
4. Work-first + any work style → existing behavior, refined

Any input combination beyond these four produces variations within these branches — not a fundamentally different output. That is honest and sufficient for v1.

### The key principle we must protect

> **The score and recommendation must actually change when the inputs change — not just the words.**

If the work infrastructure score is the same for a light-work surfer and a deep-focus worker, the engine has failed. The whole premise of trust — and the whole reason someone pays for the unlocked layer — is that TrustStay produces a recommendation shaped to their specific situation.

The moment a user suspects they are receiving a templated answer dressed in their inputs, the product loses its core claim. Build the score re-weighting first. The narrative is secondary.
