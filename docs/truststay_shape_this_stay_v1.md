# TrustStay — "Shape this stay" v1 Product Design

**Status:** Design spec, pre-implementation  
**Version:** v1  
**Scope:** City page personalization input module  

---

## 1. What is the job of this module?

One sentence: **it translates the user's trip intent into a specific, defensible base recommendation — with a reason.**

It is not collecting preferences.  
It is not filtering a directory.  
It is not a chat interface.

It is doing one specific thing: **narrowing a city from "many possible ways to stay" to "the right area for this person's specific trip."**

The module is an intent-to-recommendation translator. The input defines the user's purpose. The output is a recommendation that has a reason. The reason is what makes the user feel understood — not the recommendation itself.

Without this module, TrustStay gives the same recommendation to a surfer who needs serious work backup as it gives to a digital nomad who chose the destination entirely for coworking access. That is not useful. That is a directory.

With this module, TrustStay becomes a product that says: *"Given why you're here and how you work, your best base is X — here's why, and here's what to watch out for."*

That is the job.

---

## 2. The minimum viable input set

**Three inputs. In this order. No more for v1.**

| # | Input | Type | Required |
|---|---|---|---|
| 1 | Why are you here? | Chips — single select | Yes |
| 2 | How much does work shape your day? | 3-option selector | Yes |
| 3 | What kind of base do you want? | Chips — single select | Optional |

Total completion time: **under 20 seconds** if they know the answer (they do — they already chose this destination).

**Why these three and not more:**

The first two inputs are the minimum pair that actually bifurcate the recommendation meaningfully. A surfer who works intensely needs a different neighborhood than a surfer who barely works. A hiker who needs calls needs different infrastructure than one who goes fully async. These two inputs together define the "stay fit" space with enough resolution to generate a genuinely different recommendation for meaningfully different users.

The third input is optional but high-value when filled: it refines neighborhood character within the same recommended area. It doesn't change which zone — it changes which feel within the zone.

Everything else (food preferences, car dependence, training style, budget) is either capturable from the existing place data without asking, or belongs in a later, richer profile layer — not v1.

---

## 3. Candidate input evaluation

### Why are you here?

**Value:** Maximum. This is the single highest-leverage input because it directly changes which geography within a city is prioritized. A surfer needs proximity to breaks. A diver needs proximity to dive shops / boat docks. A hiker needs a quiet, gear-friendly base. A remote-work-first person needs the densest infrastructure cluster.

**User effort:** Near zero. Anyone visiting a destination for surf already knows they're there for surf.

**v1:** Yes — required, first field.

**Options:**  
`Surf` / `Dive` / `Hike` / `Yoga` / `Kite` / `Mainly to work` / `Just exploring`

---

### Work style / work hours

**Value:** High. This is the second bifurcation axis. It directly changes how much weight to give to coworking quality, wifi reliability, noise levels, and whether proximity to work infrastructure matters at all in the base recommendation.

**User effort:** Low. Three options is a quick recognition task, not a calculation.

**v1:** Yes — required, second field.

**Options (framed as recognizable life patterns, not time blocks):**
- `A few hours` — async, work is in the background
- `Half my day` — real work days, need reliable setup
- `Work is the main thing` — deep focus, stable infrastructure non-negotiable

---

### What kind of base do you want?

**Value:** Medium-high. Refines neighborhood character without changing the zone. Someone who wants a "local neighborhood feel" in El Zonte, El Salvador will get different micro-recommendations than someone who wants "social, expat-friendly."

**User effort:** Near zero — this is a vibe question, not a research task.

**v1:** Optional. Show it as the third chip set, pre-selected to none. If skipped, the recommendation defaults to neutral.

**Options:**  
`Social & expat scene` / `Local neighborhood feel` / `Quiet & focused`

---

### Stay duration

**Value:** Medium for recommendation, higher for secondary outputs (first-week rhythm, practical logistics). Long stays (2+ months) should surface grocery access, housing stability, and laundry. Short stays (under 10 days) should prioritize walkability and minimal setup.

**User effort:** Near zero.

**v1:** No — leave it out of the main module. Add it as a secondary optional field after the three above, only visible after the user has already engaged. Or infer it later via profile. The core recommendation doesn't change dramatically between 2 weeks and 3 weeks.

---

### Call intensity

**Value:** Medium. Relevant for noise tolerance in workspace and whether quiet backup spaces matter. But mostly capturable from "how much does work shape your day" + the place-level confidence signals already in the data.

**User effort:** Low.

**v1:** No — derive it from the work style input. "Work is the main thing" implies calls may be a factor. Surface this only in the output layer (e.g., flagging places with low noise risk).

---

### Food preferences, mobility, budget, training needs

**Value:** Low for core recommendation.  
**User effort:** Higher than the return.  
**v1:** No. These belong in a richer profile layer (v2+), or are already handled by the place categorization (gyms, food spots, walkability scores).

---

## 4. Final v1 input model

### Field set

```
Field 1: Why are you here?
Chips — single select — required
[ Surf ] [ Dive ] [ Hike ] [ Yoga ] [ Kite ] [ Mainly to work ] [ Just exploring ]

Field 2: How much does work shape your day?
Segmented selector — single select — required
[ A few hours ]  [ Half my day ]  [ Work is the main thing ]

Field 3: What kind of base do you want?
Chips — single select — optional
[ Social & expat scene ] [ Local neighborhood feel ] [ Quiet & focused ]
```

### Field order rationale

1 → 2 → 3 maps exactly from **trip purpose** → **work weight** → **vibe preference**. This is the natural mental order for a destination-known user who is thinking: *why I came → how work fits in → what I want it to feel like*.

### Interaction model

The three fields appear as a **single inline card** on the city page — above the place sections, below the city intro and routine score. It does not require a modal, a wizard, or a separate screen.

When the user selects fields 1 and 2, the recommendation section below immediately updates — live, no submit button needed. Field 3 is shown after fields 1 and 2 are selected (progressive reveal, not a separate step).

The card persists and shows the selected state so the user can revise it at any time.

---

## 5. UI behavior

**Recommended model: inline card with chips + progressive reveal.**

Not a wizard — wizards imply a process with a destination. This is not a process.  
Not a modal — modals interrupt. This should feel native to the page.  
Not a quiz — quizzes feel evaluative. This is not an evaluation.  
Not chat — chat implies a back-and-forth. This is a configuration.

The card should feel like **a lightweight tuning layer at the top of the page** — the same mental model as adjusting a filter in a professional tool. It is already there when you arrive. You fill it in as soon as you know why you are reading this page.

**Behavior spec:**

- Card is visible immediately on page load, above the place sections
- Fields 1 and 2 are both visible immediately
- Field 3 appears after field 1 AND field 2 have a selection (progressive reveal, smooth transition)
- No submit button — results update as selections are made
- Selections are stored in `localStorage` per city — if you return to the same city, your inputs are remembered
- A subtle "Reset" or "Change" link is visible once inputs are set
- On mobile: chips wrap naturally, the segmented selector becomes a full-width 3-way toggle

**Visual treatment:**

- Light card with a left teal border (same language as the CityIntro component)
- Slightly elevated from the page background
- Chips: rounded, tappable, small border — selected state in teal
- No icons on chips in v1 (adds visual noise without adding clarity)
- Label above each field in the same muted uppercase tracking style used elsewhere

---

## 6. What happens immediately after input

### Direct outputs (visible immediately, update as inputs change)

**1. Personalized base recommendation**  
Replaces or recontextualizes the current "Suggested base area" card.  
Format: Area name + 1 sentence that includes their purpose.  
Example: *"For surf + solid work backup, La Punta is your base — the highest concentration of reliable wifi cafés within 5 minutes of the main breaks."*

**2. Stay fit score**  
The generic Routine Score becomes "Your stay fit" — a number or indicator that reflects how well this place matches their specific input combination, not the generic population.

**3. Purpose callout**  
A short highlight strip below the recommendation: the 1–2 most relevant purpose-specific facts. For surf: distance to main break, best swell months. For work-first: number of coworkings, fastest confirmed wifi.

### Secondary outputs (below, update after input)

**4. Tradeoffs for this user** *(unlocked)*  
Not generic cons. Specific to their input.  
Example for surf + heavy work: *"Tradeoff: the quietest surf access is a 15-min walk from the main wifi cluster. You'll need to choose daily."*

**5. Red flags for this user** *(unlocked)*  
Things that matter to them specifically that others might not notice.  
Example for yoga + quiet base: *"Heads up: the social hostel scene is concentrated in the same two blocks as the best yoga studios — evenings can get noisy."*

**6. Work backup quality rating for their work style** *(unlocked)*  
For "work is the main thing" users: a clear signal about whether this place actually supports that.

**7. Purpose-specific places highlighted** *(unlocked)*  
Places re-tagged with their purpose. For surfers: which cafés are closest to breaks. For divers: which areas are within walking distance of dive operators.

**8. "A good first week here"** *(unlocked, AI-generated on grounded data)*  
2–3 sentences describing a realistic rhythm: where you'd work, where you'd train or surf, where you'd eat. Not a schedule — a texture.

---

## 7. Free vs unlocked

### Free (before payment)

- Input module is fully accessible — anyone can fill in their stay intent
- Personalized base area name (which area)
- One-sentence fit reason (why this area)
- Stay fit score / indicator
- Purpose callout (1–2 key facts for their purpose)

The free layer answers: **"Is this place worth exploring further for my trip?"**

### Unlocked

- Full tradeoffs specific to their input
- Red flags specific to their input
- Work infrastructure quality signal for their work style
- Full place list with purpose-relevant tagging
- "A good first week here" rhythm
- Access to all place cards (not just the 1 free preview)

**The unlock principle:**  
The unlocked layer should never feel like opening a door to more raw data.  
It should feel like: *"Now I actually understand how to stay here."*

The difference between free and paid should not be *quantity*.  
It should be *confidence*.

Frame the unlock CTA as something like:  
*"Get the full stay picture — tradeoffs, red flags, and how a good week here actually looks."*  
Not: *"Unlock 22 more places."*

---

## 8. Copy candidates

### Module title (5 candidates)

1. **Shape this stay**
2. **Make it yours**
3. **Set your stay**
4. **Tell us how you're staying**
5. **Make this place work for you**

**Recommended:** *Shape this stay* — imperative, concise, specific to TrustStay's language. Avoids "personalize" (overused), avoids "AI" (distrusted), avoids generic travel copy.

---

### Module subtitle (5 candidates)

1. *We'll show you the right base and what to watch out for, based on how you want to live here.*
2. *Two quick questions. A recommendation that actually fits your trip.*
3. *Tell us why you came and how you work. We'll show you where to base yourself.*
4. *Not a generic city guide. A stay recommendation built around your trip.*
5. *Most people pick a neighborhood by vibe. We'll help you pick one by fit.*

**Recommended:** *Tell us why you came and how you work. We'll show you where to base yourself.* — direct, honest about what it does, sets expectations correctly.

---

### CTA button label (5 candidates)

1. **Show my stay fit**
2. **Get my recommendation**
3. **Shape my stay**
4. **See what fits**
5. **Show me my base**

**Recommended:** *Show my stay fit* — specific to TrustStay's language, outcome-oriented, not generic. Pairs naturally with the "stay fit score" concept.

---

## 9. Biggest product risks

### Risk 1: Fake personalization

**The failure mode:** The recommendation output doesn't actually change when inputs change. A surfer and a remote-work-first person get the same base recommendation with slightly different words around it.

**Why it kills the product:** Users feel manipulated. They took the effort to fill in the module and got back something that feels like it was already written. This destroys trust faster than no personalization at all.

**Mitigation:** The recommendation engine must have genuine branching logic per input combination. If the data for a city doesn't support meaningful differentiation (e.g., there's only one viable area), be honest: *"For this destination, most stay purposes point to the same base — here's why."* That is also an honest, trusted answer.

---

### Risk 2: Input friction kills completion

**The failure mode:** Users skim past the module without filling it in. The city page loads, they see the inputs, they don't fill them, they get the generic recommendation, they leave feeling like TrustStay is just another city guide.

**Mitigation:** Chips and a 3-way toggle are the fastest possible input model. No text fields, no dropdowns, no sliders. The card should feel like something that takes 10 seconds if you already know why you're going — and they do. Also consider: pre-filling Field 1 if the user arrived from a category page (surf, dive, hike).

---

### Risk 3: The output doesn't feel different enough

**The failure mode:** The recommendation changes but the surrounding page feels identical. The user thinks: *"OK so you changed one sentence and the score. That's not personalization."*

**Mitigation:** The output must visibly change in more than one place. At minimum: the base area card, the stay fit score, and the order or highlighting of place sections. The user should feel the page reshape around their input — not just see a different sentence at the top.

---

### Risk 4: Overpromise on "AI"

**The failure mode:** The module implicitly or explicitly promises an AI-driven, fully bespoke plan — and delivers a template with their inputs filled in. The user notices.

**Mitigation:** Never use "AI" in the UI. Don't say "powered by." Let the output quality speak. The honesty of TrustStay's voice ("this place has tradeoffs for your specific setup") is more trustworthy than anything that claims to be personalized. Ground every output sentence in real data.

---

### Risk 5: The module becomes a blocker

**The failure mode:** Users feel they *must* fill in the module before accessing the rest of the page. This adds cognitive overhead and creates pressure.

**Mitigation:** The module is always optional. The page always shows content below it — the inputs enrich the experience but don't gate it. A user who never fills in the module should still get a useful page.

---

## 10. Final recommendation

### Best v1 interaction model

An **inline card at the top of the city page** — above the place sections, below the city intro. Three chip/selector fields. No modal, no wizard, no chat. Progressive reveal for field 3. Live page update as inputs are selected. `localStorage` persistence per city.

### Best v1 field set

```
1. Why are you here?        [Surf / Dive / Hike / Yoga / Kite / Mainly to work / Just exploring]
2. How much does work shape your day?   [A few hours / Half my day / Work is the main thing]
3. What kind of base do you want?       [Social & expat / Local neighborhood / Quiet & focused]  (optional)
```

### Best unlock behavior

Free: base area name + one-sentence fit reason + stay fit score + purpose callout.  
Unlocked: tradeoffs + red flags + work infrastructure signal + purpose-specific place highlights + first-week rhythm.

The unlock CTA is not "unlock more places." It is "get the full stay picture."

### The key product principle to protect

> **Every input must visibly change the output.**

If filling in "surf" vs "mainly to work" doesn't meaningfully change the recommendation, the module has failed — regardless of how well it looks or how fast it loads.

The module earns trust through specificity, not through cleverness. The moment a user reads a recommendation and thinks *"this is actually about my trip"* — that is the product working. That is the bar to build to.
