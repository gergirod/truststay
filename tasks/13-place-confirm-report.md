# Task 13 — Place Confirmation & Issue Reporting

## Objective
Let users confirm a place is still good or flag an issue (closed, bad wifi, wrong hours).
This feeds a trust signal ("last confirmed X days ago") and a moderation queue in admin.
Data quality improves organically without requiring accounts or a database.

## Problem
- Every place is shown with OSM + Google data that may be months or years old
- Users have no way to signal "I was here last week, this is accurate" or "this closed down"
- The product asks users to trust the data but gives them no way to contribute to it
- Wrong place data (closed, bad wifi) erodes trust and refund risk after unlock

## Must include

### A. Confirm / report UI on each place card
Shown only on **unlocked** neighborhood pages (paid users have skin in the game — quality will be higher).

Two micro-interactions on each place card:
- **Thumbs up** ("Still good") — small icon button, bottom-right of card
- **Flag** ("Report issue") — opens a compact inline dropdown with options:
  - Permanently closed
  - Wi-Fi doesn't work
  - Wrong opening hours
  - Wrong location
  - Other

After either action: button dims and shows "Thanks" — no page reload, no modal.

State is stored **per place per session** (localStorage key: `ts_confirmed_{placeId}`) so it
doesn't re-prompt on refresh.

### B. API route `/api/feedback`
Accepts `POST` with body:
```json
{
  "type": "confirm" | "report",
  "issue": "closed" | "wifi" | "hours" | "location" | "other" | null,
  "placeId": string,
  "placeName": string,
  "citySlug": string,
  "neighborhoodSlug": string
}
```

Writes to a lightweight store. Since there is no database, use a **Vercel KV** (or fallback:
POST to a free-tier Notion/Airtable API, or write to a GitHub Gist via API). KV is preferred.

If KV is not configured, log the submission server-side and return `200` so the UI never breaks.

### C. "Last confirmed" badge on places
After enough confirm signals accumulate for a place (threshold: 1+), show a small badge:
*"✓ Confirmed recently"* — subtle, not dominant.

Read from KV at render time with a short TTL (e.g. revalidate every 6 hours).

### D. Admin queue addition
Add a "Place Reports" tab to the existing admin page (`/admin`).
Shows a table: place name · city · issue type · date.
Admin can dismiss (mark resolved) or take action (add to a curated override list).

### E. No-database fallback
If KV is not set up, the UI still works:
- Thumbs up / flag interactions succeed visually
- Submissions are logged to console (server-side) and can be captured via Vercel log drains
- The "confirmed" badge is hidden until KV is wired

## Constraints
- Do not require login or account — anonymous submissions only
- Do not add the UI to free/locked neighborhood pages — unlocked only
- Do not show confirmation UI if the place has no `placeId` (legacy/minimal data)
- The UI must not distract from reading the place card — keep it visually subtle
- API must return `200` even if storage fails — never break the page over a feedback write

## Done when
- Unlocked user sees thumbs up + flag icon on each place card
- Clicking thumbs up dims the button and shows "Thanks" without reload
- Clicking flag opens inline dropdown, selecting an option submits and shows "Thanks"
- `POST /api/feedback` receives the payload and stores or logs it
- Admin page shows a Place Reports tab with submitted issues
- The entire flow works with KV disconnected (graceful no-op)
- Build and lint pass cleanly
