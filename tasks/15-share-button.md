# Task 15 — Share Button

## Objective
Let users share a neighborhood recommendation with one tap.
No login, no friction. The shared URL should land directly on the neighborhood.

## Problem
- A user finds the perfect base neighborhood for Puerto Escondido and wants to send it to a friend
  planning the same trip — there is no share action anywhere in the product
- Word-of-mouth is the highest-quality distribution channel for this product
- The recommendation ("stay in La Punta") is exactly the kind of thing people share in group chats
- Currently a user has to manually copy a URL — most won't

## Must include

### A. Share button placement
Two locations:

1. **Neighborhood recommendation card** — the "Suggested base" card shown on the city page.
   Button label: "Share this pick" or just a share icon with "Share".
   Positioned in the card header, right side, small.

2. **Neighborhood detail header** (the `h2` area with neighborhood name on the unlocked page).
   Same button, same behavior.

Do not add the share button to place cards — only to neighborhood-level content.

### B. Share behavior (progressive)
Use the Web Share API if available (`navigator.share`), fallback to clipboard copy:

```ts
if (navigator.share) {
  navigator.share({
    title: `${neighborhoodName}, ${cityName} — Truststay`,
    text: `Best base for remote workers in ${cityName}: ${neighborhoodName}. Routine score ${score}/100.`,
    url: window.location.href,
  });
} else {
  navigator.clipboard.writeText(window.location.href);
  // show "Link copied" tooltip
}
```

On mobile (iOS/Android): Web Share API opens the native share sheet (WhatsApp, Messages, etc.).
On desktop: copies the link and shows a "Link copied!" tooltip for 2 seconds.

### C. "Link copied" tooltip
Small tooltip or inline text that appears next to the button for 2 seconds then fades out.
No modal, no alert, no toast library — just a CSS transition on a `<span>`.

### D. Analytics event
Fire a PostHog event on share:
```ts
posthog.capture("neighborhood_shared", {
  city_slug: citySlug,
  neighborhood_slug: neighborhoodSlug,
  method: navigator.share ? "native" : "clipboard",
});
```

### E. Open Graph / link preview
When the shared URL is opened in WhatsApp, iMessage, Twitter, etc., it should show a
rich preview. Verify that the city page already has:
- `og:title` — e.g. "La Punta, Puerto Escondido — Truststay"
- `og:description` — the routine score and category summary
- `og:image` — the existing `/og.png` or a dynamic image

If `og:image` is missing or generic, update the city page metadata to include it.
A static `og.png` is acceptable — a dynamic image per city is a bonus.

## Constraints
- Button must work on both mobile and desktop
- Do not depend on any share library — use native Web Share API + clipboard fallback only
- Do not show the share button on the free/locked page — only where neighborhood name is shown
- The tooltip must not shift layout — use `position: absolute` or similar

## Done when
- Share button appears on the neighborhood recommendation card
- On mobile, tapping it opens the native share sheet
- On desktop, clicking it copies the link and shows "Link copied!" for 2 seconds
- PostHog event fires on share
- The shared URL opens the correct city/neighborhood page
- Build and lint pass cleanly
