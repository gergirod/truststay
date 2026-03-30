# 008 — API Contracts

## POST /api/recommendation

**Purpose**: Main entry point. Takes city slug + intent, returns structured FinalOutput.

### Request

```json
{
  "citySlug": "popoyo",
  "cityName": "Popoyo",
  "country": "Nicaragua",
  "intent": {
    "purpose": "surf",
    "workStyle": "heavy",
    "dailyBalance": "work_first"
  },
  "message": "where should I stay for 3 weeks to surf and keep my work routine"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `citySlug` | string | Yes | |
| `cityName` | string | Yes | |
| `country` | string | Yes | |
| `intent.purpose` | StayPurpose | Yes | |
| `intent.workStyle` | WorkStyle | Yes | |
| `intent.dailyBalance` | DailyBalance | No | defaults to "balanced" |
| `message` | string | No | enriches UserProfile via intent extraction |

### Response (200)

Full `FinalOutput` object matching `007-output-schema.json`.

### Response (400)

```json
{
  "error": "INVALID_INPUT",
  "details": "citySlug is required"
}
```

### Response (503)

```json
{
  "error": "ENGINE_UNAVAILABLE",
  "details": "Scoring engine failed",
  "partial": { "user_profile": {...} }
}
```

**Caching**: Results cached in KV by `{citySlug}:{purpose}:{workStyle}:{dailyBalance}` for 24h.

---

## POST /api/intent/extract

**Purpose**: Extract structured `UserProfile` from a natural language message.

### Request

```json
{
  "message": "where should i stay in popoyo for 2 weeks to surf, work remotely, keep my routine, have gym nearby, and nice coffee places to work"
}
```

### Response (200)

```json
{
  "user_profile": {
    "destination": "Popoyo",
    "duration_days": 14,
    "main_activity": "surf",
    "work_mode": "balanced",
    "daily_balance": "purpose_first",
    "routine_needs": ["gym", "laptop_cafe"],
    "budget_level": null,
    "preferred_vibe": null,
    "transport_assumption": "unknown",
    "hard_constraints": ["must_have_gym"]
  },
  "confidence": 0.85,
  "raw_signals": ["surf", "work remotely", "keep my routine", "gym nearby", "coffee places to work"]
}
```

---

## POST /api/micro-areas/discover

**Purpose**: Discover micro-areas for a destination. Used internally and by admin tools.

### Request

```json
{
  "destination": "Popoyo, Nicaragua",
  "activity": "surf"
}
```

### Response (200)

```json
{
  "micro_areas": [
    {
      "id": "popoyo-guasacate",
      "name": "Guasacate",
      "destination": "Popoyo, Nicaragua",
      "center": { "lat": 11.535, "lon": -85.993 },
      "radius_km": 0.8,
      "description": "Main surf village with colivings and walkable beach access",
      "tags": ["surf_village", "walkable", "thin_work_infra"]
    }
  ]
}
```

---

## POST /api/score

**Purpose**: Score a single micro-area given an evidence pack and weights. Used for testing and admin.

### Request

```json
{
  "evidence_pack": { ... },
  "weights": { ... },
  "user_profile": { ... }
}
```

### Response (200)

```json
{
  "score_card": { ... }
}
```

---

## GET /api/health

**Purpose**: Liveness check.

### Response (200)

```json
{
  "status": "ok",
  "version": "1.0.0",
  "engine": "deterministic-v1"
}
```
