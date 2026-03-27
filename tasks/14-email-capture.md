# Task 14 — Email Capture

## Objective
Collect user emails at two high-intent moments so we can reach users after they leave.
No newsletter. No spam. Product-relevant notifications only: new spots added, city updated.

## Problem
- Every user who searches, browses, or pays leaves without any way to reach them again
- No owned audience means every distribution effort starts from zero
- Post-payment is the highest-trust moment in the product — currently nothing is captured there
- Users who want a city that isn't covered yet have no way to get notified when it's added

## Must include

### A. Post-search email prompt (homepage / city not found)
When a user searches a city that either:
- Is not in `KNOWN_CITY_SLUGS`, OR
- Returns geocode results but has limited data (coverage = "limited")

Show a small inline prompt **below the "not found" message** or below the coverage notice:

> *"Want us to notify you when we add [City Name]?"*
> `[email input]` `[Notify me →]`

Single field, no name, no checkbox. On submit: show "We'll let you know." and store the email
with the city slug as context.

### B. Post-payment email prompt
After a successful Stripe payment (on the `/checkout/success` page), before showing the
"your neighborhood is unlocked" confirmation, show:

> *"Want a heads up if this neighborhood's data is updated?"*
> `[email input]` `[Yes, notify me →]` `[Skip]`

Store email with city slug + neighborhood slug as context.

### C. Optional: homepage "new destinations" prompt
A subtle strip below the DestinationBrowse section:

> *"We add new spots regularly. Get notified."*
> `[email input]` `[Stay in the loop →]`

This is lowest priority — only add if A and B are clean.

### D. API route `/api/subscribe`
Accepts `POST`:
```json
{
  "email": string,
  "context": "city_not_found" | "post_payment" | "homepage",
  "citySlug": string | null,
  "neighborhoodSlug": string | null
}
```

Integrates with **Resend** (preferred — already common in Next.js apps, free tier = 3k/month)
or **Loops** (built for product emails, free tier = 2k contacts).

If neither is configured, log server-side and return `200` — never block the user flow.

Use `RESEND_API_KEY` or `LOOPS_API_KEY` from env. If not set, skip the external call.

### E. Email validation
- Client-side: basic format check before submit
- Server-side: reject clearly invalid formats, return `400` with `{ error: "Invalid email" }`
- Duplicate submissions: silently succeed (don't tell the user "already subscribed" — just "Thanks")

### F. UI style
- Inputs and buttons match existing product style (sand background, bark text, teal accent)
- No modal — always inline
- Submit state: button shows spinner then "Done ✓", input is cleared
- Error state: show "Something went wrong. Try again." below input — never crash the page

## Constraints
- No account creation, no password, no profile — just email + context
- Do not add a marketing newsletter — these are transactional/product notifications only
- The prompt must never block content — always skippable
- Do not add more than 2 email prompts to any single page
- GDPR: include a single line of fine print: *"No newsletters. Product updates only."*

## Done when
- City-not-found page shows email prompt with city name in copy
- Checkout success page shows email prompt before unlock confirmation
- `POST /api/subscribe` stores email via Resend/Loops or logs gracefully
- Submitting shows "Done ✓" without page reload
- Duplicate submit is handled silently
- Build and lint pass cleanly
