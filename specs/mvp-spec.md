# Trustay MVP Spec

## MVP objective
Ship a working web MVP that lets a user:
1. search for a city
2. get a recommended area for routine setup
3. see work, training, and food support around that area
4. understand confidence levels for places
5. hit a Stripe paywall to unlock the deeper view

## MVP scope

### Included
- homepage with city search
- city lookup via geocoding
- city page for supported or discovered cities
- simple area recommendation based on available signals
- sections for:
  - work spots
  - coworking backups
  - gyms
  - food / coffee support
- place cards with confidence labels
- free vs locked content states
- Stripe Checkout integration for one-time purchase
- lightweight unlock handling via Stripe email / session

### Not included
- user-generated reviews
- saved favorites
- account dashboard
- compare cities
- maps-heavy UI
- booking flow
- neighborhood polygon perfection
- AI chat assistant
- native mobile app

## MVP user flow
1. User lands on homepage.
2. User searches for a city.
3. App geocodes the city.
4. App fetches nearby places by category.
5. App computes a simple city/area recommendation.
6. User sees a useful free page with partial value.
7. Deeper sections and full place lists are locked.
8. User can buy a City Pass via Stripe Checkout.
9. On successful payment, the unlocked view becomes available.

## MVP outcome on city page
The city page must answer:
- Is this city workable for my routine?
- Which area seems best for me?
- What are my best work backup options?
- Where can I train nearby?
- Can I find decent coffee / food close to the suggested area?

## MVP city page sections
1. Hero summary
2. Recommended area
3. Work support summary
4. Work spots
5. Coworking backup
6. Training spots
7. Food / coffee support
8. Locked deeper insight block
9. Honest methodology / confidence note

## MVP monetization behavior
### Free user can see
- city hero
- top-level trust/routine summary
- recommended area name / label
- top 2 work spots
- top 1 coworking
- top 1 gym
- limited explanation

### Paid user can see
- full place lists
- deeper explanations
- more confidence breakdown
- additional “best for” tags
- all supporting categories

## MVP success definition
The product is usable when a user can enter a city and quickly understand:
- the best area to use as a base
- where to work if needed
- where to train nearby
- whether the place feels routine-friendly
