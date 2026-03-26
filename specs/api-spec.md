# API Spec

## GET /api/geocode
### Purpose
Resolve a city name into coordinates and display metadata.

### Query params
- `q`: string

### Response
```json
{
  "ok": true,
  "city": {
    "name": "Antigua Guatemala",
    "slug": "antigua-guatemala",
    "country": "Guatemala",
    "lat": 14.5597,
    "lon": -90.7343
  }
}
```

## GET /api/city-data
### Purpose
Fetch categorized places and computed trustay output for a city.

### Query params
- `slug`: string
- `lat`: number
- `lon`: number

### Response shape
```json
{
  "ok": true,
  "city": {
    "name": "Antigua Guatemala",
    "slug": "antigua-guatemala",
    "country": "Guatemala",
    "lat": 14.5597,
    "lon": -90.7343
  },
  "summary": {
    "routineScore": 74,
    "summaryText": "Good for a short remote-work stay with useful backup options.",
    "recommendedArea": "Central Antigua"
  },
  "sections": {
    "workSpots": [],
    "coworkings": [],
    "gyms": [],
    "foodSpots": []
  }
}
```

## POST /api/checkout
### Purpose
Create a Stripe Checkout session.

### Request body
```json
{
  "product": "city_pass",
  "citySlug": "antigua-guatemala"
}
```

### Response
```json
{
  "ok": true,
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## POST /api/stripe/webhook
### Purpose
Handle Stripe checkout completion.

### Required events
- `checkout.session.completed`

### Behavior
- validate signature
- inspect purchased product
- mark the city or pass as unlocked by the buyer email or chosen lightweight mechanism

## Type contracts
Create a central types file with:
- `City`
- `CitySummary`
- `Place`
- `PlaceConfidence`
- `CheckoutProduct`
