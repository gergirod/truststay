# Task 18 — "Last Confirmed" Badge on Places

## Objective
Show a small "Confirmed recently" badge on place cards that have received positive signals
from real users. This increases trust and conversion — users can see which places have been
validated by humans who were actually there.

## Dependency
This task requires Task 13 (Place Confirmation & Issue Reporting) to be live and collecting data.
Do not build the badge UI before there is at least some confirmation data to display.
Estimate: start this task when Task 13 has been live for at least 1–2 weeks.

## Problem
- Currently all places are shown with equal confidence regardless of whether anyone has
  verified them recently
- A place confirmed by 3 people last week is more trustworthy than one with only OSM data
  from 2021 — but the UI treats them identically
- The "wifi: likely" confidence label helps, but it says nothing about recency
- Showing confirmation counts creates a positive feedback loop: users see the badge,
  trust the data more, confirm more places

## Must include

### A. Confirmation count read from KV
At render time for unlocked city pages, read the confirmation counts from Vercel KV
(written by Task 13's `POST /api/feedback`).

KV key pattern: `confirm:{placeId}` → value: `{ count: number, lastAt: string (ISO date) }`

Fetch all relevant keys for the neighborhood in a single batch call to avoid N+1 requests.
Cache the result server-side with a 6-hour revalidation window (not per-request).

If KV is not configured or the read fails, all badges are hidden — graceful no-op.

### B. Badge display rules
Show the badge only when:
- `count >= 1` (at least one user confirmed)
- `lastAt` is within the last 90 days

Badge text variants:
- `count === 1`: `"✓ Confirmed"`
- `count >= 2`: `"✓ Confirmed by {count}"`

Do NOT show:
- The exact date (too volatile, not meaningful to most users)
- The count if it is 0
- The badge on free/locked pages

### C. Badge component
Small inline pill, positioned inside the place card, below the place name, before the
distance/hours metadata row.

Style: subtle — light teal background (`bg-teal-50`), teal text (`text-teal-700`), small
font size (`text-xs`), no border. Should feel like a quiet positive signal, not a
marketing badge.

```tsx
{confirmCount >= 1 && (
  <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
    ✓ {confirmCount === 1 ? "Confirmed" : `Confirmed by ${confirmCount}`}
  </span>
)}
```

### D. Reported places treatment
If a place has open reports from Task 13 that have not been dismissed by admin:
- Do NOT show the "Confirmed" badge
- Optionally show a subtle `"⚠ Check before visiting"` note if `reportCount >= 2`
  (i.e. multiple users flagged the same place — this is meaningful signal)

Do not show any report warning for a single report — could be wrong or malicious.

### E. No badge count inflation protection
A single browser session should not be able to inflate the count.
Task 13 already stores confirmation state in localStorage per place per session.
On the API side: rate-limit confirms to 1 per IP per placeId per 24 hours (simple KV TTL check).

## Constraints
- Badge must not appear on free/locked pages
- Read from KV must not block page render — use `Promise.allSettled`, never `await` in a
  way that fails the whole page if KV is down
- Do not show a "0 confirmations" or empty badge state — either show the badge or show nothing
- Badge styling must not increase place card height on mobile

## Done when
- Places with 1+ confirmation in KV show the "✓ Confirmed" badge
- Places with 2+ show "✓ Confirmed by N"
- Places with open reports (2+ unreplied) show "⚠ Check before visiting"
- Badge is absent on all free/locked pages
- KV unavailable → all badges hidden, no error thrown
- Confirmation count cannot be trivially inflated (rate-limit in place)
- Build and lint pass cleanly
