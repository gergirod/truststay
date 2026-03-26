# Technical Spec

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Vercel for deployment
- Stripe Checkout for payments
- PostHog or Plausible for analytics

## Data source strategy for Phase 1
### Geocoding
Use Nominatim or a similar geocoding source for city-to-coordinate lookup.

### Places
Use OpenStreetMap / Overpass for initial category-level place discovery:
- cafes
- coworkings
- gyms
- food spots

### Future optional enrichment
Google Places or Foursquare may be added later for richer metadata.
Do not add both in MVP.

## Architecture
### App routes
- `/`
- `/city/[slug]`
- `/checkout/success`
- `/checkout/cancel`
- `/api/geocode`
- `/api/city-data`
- `/api/checkout`
- `/api/stripe/webhook`

### Core modules
- `lib/geocode.ts`
- `lib/overpass.ts`
- `lib/scoring.ts`
- `lib/confidence.ts`
- `lib/stripe.ts`
- `lib/slug.ts`
- `lib/format.ts`

### Components
- `CitySearch`
- `CityHero`
- `RoutineSummaryCard`
- `RecommendedAreaCard`
- `PlaceCard`
- `PlaceSection`
- `PaywallCard`
- `ConfidenceBadge`

## State strategy
Prefer server-side fetching for city pages where possible.
Keep client state minimal.

## Persistence
MVP does not require a full database.

Allowed temporary patterns:
- in-memory or file-based supported city metadata
- payment unlock keyed by Stripe session / email through a lightweight store later if needed

If a persistent data store becomes necessary, prefer minimal integration only after MVP flow works.
Do not introduce a database in Task 01 unless explicitly needed.

## Error handling
Graceful states required for:
- city not found
- place fetch failure
- partial data returned
- Stripe checkout failure

## Performance principles
- fast first render
- minimal JS where possible
- avoid map libraries in MVP if list/card UI works better and faster
