# Task 19 — City Request Voting

## Objective
Let users upvote cities they want added to Truststay. The vote counts are visible publicly,
creating social proof for requested cities and giving us a clear signal for curation priority.

## Problem
- Users who search a city not in the system see "City not found" — they leave with no recourse
- We have a backend demand queue (admin tool) that shows searches but it's internal only
- There is no public mechanism for users to signal "I need this city" and see others do the same
- Without a voting signal, curation decisions are based on guesses about demand

## Must include

### A. `/city-requests` public page
A new page at `/city-requests` showing:
- Heading: "Cities you've asked for"
- Subheading: "We add new destinations based on demand. Vote for the ones you need."
- List of requested cities sorted by vote count (highest first)
- Each row: city name · country flag or region · vote count · "Vote" button
- Filter by region (same pill style as DestinationBrowse: All / Mexico / Central America /
  Caribbean / South America)

Votes are stored in Vercel KV: `votes:{citySlug}` → count (integer).
Read at render time, revalidate every 1 hour (not per-request).

### B. Vote action
One vote per browser session per city (localStorage: `ts_voted_{citySlug}`).
No account, no email required.

Clicking "Vote":
- Optimistic UI: increment count immediately
- `POST /api/vote` with `{ citySlug, cityName }`
- On success: button changes to "Voted ✓" (disabled)
- On error: revert count, show "Try again"

Rate-limit server-side: 1 vote per IP per city per 24 hours (KV TTL).

### C. Seeding initial requests
Pre-seed the page with cities that already appear in the admin demand queue
(the existing `POST /api/admin/demand` data). This prevents the page from launching empty.

If KV is empty, fall back to a static list of 20–30 commonly requested cities not yet in
`KNOWN_CITY_SLUGS`. Store this as `SEED_REQUESTS` in the page file.

### D. "Request a city" form
At the top of the page, a simple form:
- City name (text input)
- Country (text input or select)
- Submit → adds to the list with 1 vote (the submitter's) if not already present

Server-side: normalize city name, generate a slug, check it doesn't already exist in
`KNOWN_CITY_SLUGS` (if it does, redirect to that city's page). Store in KV.

### E. Link from "City not found" state
On the city page, when geocoding returns no result, add a link:
> *"Want to see [City] on Truststay? Vote for it →"*
Link goes to `/city-requests?city={searchedSlug}` and auto-focuses that city's row (or
the "request" form if not yet listed).

### F. Admin integration
The `/admin` page should show the city requests table sorted by votes.
Same data as the public page — admin can see what's being demanded and act accordingly.
(The existing demand queue shows searches; this shows explicit votes — different signal.)

### G. SEO
`/city-requests` is a public, static-ish page. Give it:
- `title`: "Cities you're asking for — Truststay"
- `description`: "Vote for the destinations you want added to Truststay's remote worker neighborhood guide."

## Constraints
- Do not require login or account for voting
- Do not allow the same city to be added twice (normalize slugs on submission)
- City request form must not accept a city that is already in `KNOWN_CITY_SLUGS`
  — redirect to the actual city page instead
- If KV is unavailable, the page renders with the static seed list (no counts visible)
- The page must be mobile-friendly — vote button must be tappable

## Done when
- `/city-requests` renders a sorted list of requested cities with vote counts
- Clicking "Vote" increments the count and disables the button for that session
- "Request a city" form adds a new city to the list with 1 initial vote
- Requesting an existing city redirects to its actual page
- City-not-found state links to `/city-requests` with the searched city pre-highlighted
- Admin page shows the vote-ranked city request list
- Build and lint pass cleanly
