# TrustStay — Best Base Unlock v1

**Status:** Ready to spec  
**Depends on:** Milestone 1 backend (computeStayFitScore, dailyLifePlaces, redFlags)  
**Does not require:** LLM layer, chat, reviews, trip planning  

---

## 1. Product goal

Best Base Unlock is the moment TrustStay stops being a utility and becomes a recommendation.

Every other tool — Google Maps, Airbnb, travel blogs — tells you what exists somewhere. TrustStay tells you where to position yourself *given how you want to work and live there*.

This feature proves one thing to the user: **we looked at your situation specifically, not a generic traveler's situation, and we have a clear answer.**

The answer is not "here are some options." It is:

> "Base yourself in La Punta. Your work setup works there. Your groceries are close. The tradeoff is noise on weekends — plan your deep work sessions for mornings."

That is what this unlock sells. Not access. **Clarity.**

---

## 2. Core user promise

> **Know exactly where to stay in [City] before you book — and why it fits how you work.**

This lands because it addresses the real pre-trip anxiety:

- "I don't know which neighborhood to pick."
- "I don't want to book the wrong Airbnb and realize it's not walkable."
- "I want to feel set up when I arrive, not figuring things out."

The promise is not "more information." It is **less decision-making after you land.**

It should feel like:

- **Confidence** — we have a clear answer, not a list of options
- **Preparation** — you know what to expect before you arrive
- **Fit** — this is matched to *your* kind of stay, not a generic remote worker
- **Clarity** — one recommendation, specific tradeoffs, no hedging

It should not feel like:

- A locked directory ("unlock 40 more places")
- A premium map feature
- A travel blog recommendation
- A "smart filter"

---

## 3. What the unlocked feature should show

### Full candidate list and verdict:

| Element | Include in v1? | Reason |
|---|---|---|
| Recommended base area name | **YES** | This is the core answer |
| "Why this fits" (2–3 sentences) | **YES** | Without this it's just a name — not a recommendation |
| 2 key tradeoffs | **YES** | Honesty is the product; tradeoffs build trust more than promises |
| 1 main red flag | **YES, if present** | The most trust-building element — shows we're not selling |
| 2 nearby support places | **YES** | One work spot + one daily-life — grounds the recommendation spatially |
| Fit score | **Teaser free, breakdown paid** | Number builds curiosity; breakdown is the paid payoff |
| Score breakdown (work/life/purpose) | **Paid only** | Too much for free — earns its place in the unlock |
| Map highlight | **YES** | The recommendation must be visible spatially |
| 1 backup work spot | **NO** | Too operational for v1 — add in milestone 2 when purpose data exists |
| Alternative base area | **NO** | Undermines decisiveness — one clear answer first |

### v1 minimum unlock set (6 elements):

```
1. Recommended base area name         — where
2. Why this fits (2–3 sentences)      — why, matched to their intent
3. 2 key tradeoffs                    — what to plan around
4. 1 main red flag (if any)           — the honest warning
5. 2 nearby support places            — one work + one grocery/pharmacy
6. Score breakdown chip (work / life) — proof the score is real
```

This is the smallest set that feels worth paying for. Every element is load-bearing:
- Remove the "why" and it's just a label
- Remove the tradeoffs and it feels promotional
- Remove the red flag and trust drops
- Remove the support places and it's abstract
- Remove the breakdown and the score is meaningless

---

## 4. Free vs paid split

### The principle:

**Free should build trust. Paid should answer the question.**

The question is: *"Okay, but where should I actually stay?"*

Free must get close enough to that question to feel honest, but not answer it.

### Free tier shows:

- Routine score (number only — e.g. "62 / 100")
- "Suggested base area: **[Area Name]**" — name visible, nothing else
- One place per section (café, food, wellbeing)
- Map with all pins, locked ones as grey dots
- A single-line hint: *"Your stay-fit analysis is ready — unlock to see why this base fits you."*

### Paid tier shows:

- Full base area card: why it fits (matched to intent), tradeoffs, red flag
- Score breakdown: work fit / daily-life fit / purpose fit (once available)
- 2 highlighted support places with context
- Full place list (all sections)
- Map with base area highlighted, daily-life pins visible
- narrativeInputs → LLM-generated summary in milestone 3

### Why this split works:

Free shows enough to be useful for zero-intent users — it's a basic curated map. Paid answers the one question generic maps cannot: *given how I work and what I need daily, where specifically should I base myself in this place?*

That gap is the product.

---

## 5. UI pattern recommendation

### Evaluated options:

| Pattern | Verdict |
|---|---|
| Locked recommendation card (inline) | **Best — choose this** |
| Teaser with blur/overlay | Feels deceptive — avoid |
| Unlock modal after intent input | Interrupts flow — too aggressive |
| Separate paywall card below sections | Too far from context — weaker |
| Premium map feature | Wrong frame — map supports, doesn't lead |

### Recommended pattern: Inline locked card

Placement: **between the map and the place sections** — after the user has seen the map and score, before they see the places.

This is the right moment because:
1. The user just saw the map — they're spatially oriented
2. They've seen the score — they know there's something here
3. They haven't yet committed to scrolling through every section — they're still deciding

The card occupies the natural break. It answers: *"Before you scroll through all of this, here is what we recommend."*

#### Free state of the card:

```
┌─────────────────────────────────────────────────────┐
│  Suggested base area                                │
│  ─────────────────                                  │
│  La Punta                                           │
│                                                     │
│  [Routine: 58/100] [Work fit: —] [Daily life: —]   │
│                                                     │
│  ░░░░ Why this fits your kind of stay ░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                     │
│  [Unlock your base →]                               │
└─────────────────────────────────────────────────────┘
```

The "why it fits" is present but obscured — not blurred text (that looks cheap) but a frosted-glass placeholder with the same line lengths. This shows structure without revealing content.

#### Unlocked state of the card:

```
┌─────────────────────────────────────────────────────┐
│  Your base in Puerto Escondido                      │
│  ─────────────────────────────                      │
│  La Punta                                           │
│                                                     │
│  "Close to the main surf break and the only         │
│   coworking in town. Walk to your morning session,  │
│   work mid-day, groceries 10 min by scooter."       │
│                                                     │
│  Work fit 48 · Daily life 32 · Purpose —            │
│                                                     │
│  ⚠ No grocery within walking distance              │
│                                                     │
│  Plan around                                        │
│  · Café wifi unverified — bring a backup            │
│  · Quiet mornings, louder evenings near the break   │
│                                                     │
│  Nearby that works for you                          │
│  ☕ Café Pakal · 0.3 km                              │
│  🛒 Chedraui Express · 1.8 km                       │
└─────────────────────────────────────────────────────┘
```

---

## 6. How map and list should support this

### The principle: recommendation leads, map supports

The card answers the question. The map confirms it spatially. The list gives depth.

### Map behavior:

**Free state:**
- Base area marker (home pin) appears at the work-cluster centroid — same as today
- Label: "Suggested base — [City Name]"
- Locked places appear as grey dots
- No daily-life pins

**Unlocked state:**
- Base area marker becomes more prominent — larger, labeled with the actual area name
- The 2 highlighted support places from the card have their own markers in the map — they visually reinforce the recommendation
- Daily-life pins (grocery / pharmacy) appear in sage green and dusty rose
- The map legend updates to include grocery + pharmacy entries
- Popup on base marker: *"Your base · [Area Name] · [fit label]"*

**What the map should NOT do:**
- Not the primary entry point to the unlock — the card leads
- Not show all daily-life places (cluttered) — only the 2 top picks highlighted by the recommendation
- Not change zoom level dramatically — continuity from free to unlocked feels premium

### How list supports:

- The 2 "Nearby that works for you" places from the card scroll-link to their full card in the place sections below
- Their card gets a subtle "Recommended for your base" tag — the only visual differentiation
- The rest of the list is unchanged — the recommendation highlights, not replaces

---

## 7. Copy

### Unlock headlines (card header in locked state):

1. **"Your base in [City], matched to your stay."**
2. **"Know where to stay before you book."**
3. **"Where to anchor yourself in [City]."**
4. **"One recommendation. Matched to how you work."**
5. **"Your [City] base — and why it fits."**

**Choose:** #2 — "Know where to stay before you book." — most direct pain point.

### Subheadlines (below the headline in locked state):

1. *"We looked at your work style, daily needs, and what you came here for. Here's where to stay."*
2. *"Not just a neighborhood. A base that fits how you actually live while working."*
3. *"[Area Name] is your base. Unlock to see why — and what to plan around."*
4. *"One clear answer. With the tradeoffs you should know before you arrive."*
5. *"Based on wifi, groceries, your kind of work, and the rhythm of this place."*

**Choose:** #1 — most grounded, explains the inputs without being technical.

### CTA labels:

1. **"Unlock your base →"**
2. **"See where to stay"**
3. **"Get your base area"**
4. **"Unlock full analysis"**
5. **"See the recommendation"**

**Choose:** #1 — "Unlock your base →" — direct, personal, action-oriented.  
Avoid "Unlock full analysis" — sounds like a tool, not a recommendation.

### Tone rules:

- Calm — not urgent, not FOMO-driven
- Decisive — one answer, not "it depends"
- Grounded in data — mention wifi, groceries, distance — real things
- Never: "amazing," "perfect," "best," "hidden gem"
- Never: "click here," "limited time," "upgrade"

---

## 8. Why this is worth paying for

The honest answer to "why would someone pay for this?" is:

**They've already made the expensive commitment — the flight, the work trip, the remote month. They are not trying to decide whether to go. They are trying to not waste that commitment.**

The fear is not "I might go somewhere bad." The fear is:

- "I'll book the Airbnb in the wrong neighborhood and spend a week figuring out where I actually should have stayed."
- "I'll arrive and realize there's no grocery within walking distance and my first day is errands."
- "I'll realize the cafés have no wifi and I should have brought a SIM card."
- "I'll lose a day of work because I had to move accommodation."

TrustStay doesn't sell information. It sells the absence of that friction.

The unlock answers: *"Okay, but where should I actually stay in this place — given the kind of month I'm trying to have?"*

No travel blog, no Airbnb, no Google Maps does that with this specificity.

**The price of getting it wrong is already far higher than the unlock price.** The unlock is cheap relative to the cost of a misaligned stay.

---

## 9. Risks

### Risk 1: The "why it fits" is too generic

If the explanation sounds like it could apply to any city — *"Good café density, walkable area"* — the unlock feels like a paywalled directory.

**Prevention:** The "why it fits" must reference the user's specific intent. For a surf + light work profile it must mention the surf access or morning work window. For a work-primary profile it must prioritize coworkings and verified wifi. This is where the `narrativeInputs` from milestone 1 earn their place — they contain the specific data the LLM needs to generate a grounded explanation.

### Risk 2: The card feels like "5 more places"

If the unlock reveals a list of places instead of a clear recommendation, it is a directory.

**Prevention:** The card must lead with the area name and the "why" — not with a place list. The 2 support places are there to spatially ground the recommendation, not to be the product themselves.

### Risk 3: The card overloads

Too many elements (score + breakdown + tradeoffs + red flags + places + maps link + CTA) = decision paralysis.

**Prevention:** The visual hierarchy must be strict:
1. Area name (largest, most prominent)
2. Why it fits (the only paragraph — not a list)
3. Tradeoffs (2 items max — a bullet pair, not a section)
4. Red flag (one warning, if present)
5. 2 support places (small, compact)

Everything else (score breakdown) lives below the fold or in a secondary expandable.

### Risk 4: The recommendation doesn't feel decisive

If the copy hedges ("might be a good area," "could work for you"), users don't trust it.

**Prevention:** Write the recommendation declaratively. "Base yourself in La Punta." Not "La Punta could be a good option." The tradeoffs do the nuancing — the recommendation itself should be stated with confidence.

---

## 10. Final recommendation

### Best v1 unlock concept:

**"Your base, matched."** — A single decisive recommendation card that tells the user exactly where to anchor themselves in this destination, why it fits their specific work and life setup, what to plan around, and what's nearby that makes it work.

### Best free vs paid split:

| Free | Paid |
|---|---|
| Score (number only) | Score breakdown (work / life) |
| Base area name | Base area name + "why it fits" |
| 1 place per section | Full place list |
| Grey dot map | Daily-life pins + highlighted support places |
| Hint that fit analysis exists | Full tradeoffs, red flags, 2 support places |

### Best UI pattern:

**Inline locked card** between the map and place sections. No modal, no blur, no dedicated paywall page. The card is always present — it just reveals more when unlocked.

### Exact visible outputs to build first (in priority order):

1. Recommended base area name — always visible (free + paid)
2. "Why this fits" paragraph — unlocked only (in v1, algorithmic; LLM in milestone 3)
3. 2 key tradeoffs — unlocked only
4. 1 red flag (if redFlags.length > 0) — unlocked only
5. 2 nearby support places — unlocked only
6. Score breakdown (work / daily-life chips) — unlocked only

The "why this fits" in v1 before the LLM is a templated string built from `narrativeInputs.workInfrastructureSummary` and `narrativeInputs.dailyLifeSummary` — not a blank, but a data-grounded sentence that reads naturally. This means the feature works and feels real from day one, even before the LLM layer lands.
