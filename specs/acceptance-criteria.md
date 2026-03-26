# Acceptance Criteria

## MVP-level acceptance
The MVP is acceptable when all the following are true.

### Search and city lookup
- user can search for a city from homepage
- city resolves to a dedicated city page
- city page loads without crashing

### City page value
- city page shows a routine summary
- city page shows a recommended area
- city page shows at least one section each for work, training, and food support
- city page uses confidence language instead of fake certainty

### Place cards
- each place card renders required fields when available
- each place card includes at least one confidence signal
- each place card includes a short explanation
- no forbidden certainty language is used

### Paywall and payment
- paywall is visible on city page in locked state
- user can start checkout from city page
- Stripe Checkout session is created successfully
- successful payment returns to success state

### UI quality
- homepage is clean and usable
- city page is easy to scan on desktop
- core layout is usable on mobile

### Technical quality
- app builds successfully
- app deploys on Vercel
- no unnecessary auth flow is required for first value
- no database dependency is required in the first minimal slice unless explicitly added in later tasks

## Forbidden behaviors
- building a booking engine
- adding broad social features
- adding complex auth before value is proven
- inventing verified signals without evidence
- overcomplicating maps or filters in MVP
