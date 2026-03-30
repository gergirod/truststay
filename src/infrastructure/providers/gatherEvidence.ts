/**
 * gatherEvidenceForMicroArea — collects structured EvidencePack for a micro-area.
 *
 * Strategy (in order):
 *   1. Google Places Nearby Search (cafés, coworkings, gyms, restaurants)
 *      — real data, limited to the zone's radius
 *   2. LLM fill-in for qualitative fields (wifi reputation, vibe, sleep noise,
 *      friction, budget estimates) — grounded by known_venues from discovery
 *   3. Assemble into a validated EvidencePack
 *
 * Confidence:
 *   - "high"   if Google Places returned 5+ results across categories
 *   - "medium" if 2–4 results
 *   - "low"    if 0–1 results (LLM fill-in dominates)
 */

import OpenAI from "openai";
import { haversineKm } from "@/lib/overpass";
import type { MicroAreaDef } from "@/application/use-cases/discoverMicroAreas";
import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";
import { EvidencePackSchema } from "@/schemas/zod/evidencePack.schema";
import { canonicalRepository } from "@/db/repositories";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { weekdayDescriptions?: string[] };
  websiteUri?: string;
}

// ── Google Places Nearby Search ───────────────────────────────────────────────

async function searchNearby(
  lat: number,
  lon: number,
  type: string,
  radiusMeters: number
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.location",
          "places.formattedAddress",
          "places.rating",
          "places.userRatingCount",
          "places.currentOpeningHours",
          "places.websiteUri",
        ].join(","),
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: radiusMeters,
          },
        },
        includedTypes: [type],
        maxResultCount: 5,
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { places?: GooglePlaceResult[] };
    return data.places ?? [];
  } catch {
    return [];
  }
}

// ── Google Places Text Search — for known venues by name ─────────────────────

async function searchByText(
  query: string,
  lat: number,
  lon: number,
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.location",
          "places.formattedAddress",
          "places.rating",
          "places.userRatingCount",
          "places.currentOpeningHours",
          "places.websiteUri",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: 10000,
          },
        },
        maxResultCount: 5,
      }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { places?: GooglePlaceResult[] };
    return data.places ?? [];
  } catch {
    return [];
  }
}

// ── LLM fill-in for qualitative evidence ─────────────────────────────────────

// Typed shape of what the LLM fill-in returns (not EvidencePack — its own flat schema)
interface LLMFillResult {
  wifi_reputation?: string;
  internet_score_estimate?: number;
  work_environment_notes?: string;
  has_coliving?: boolean;
  coliving_name?: string | null;
  coliving_price_per_night?: number | null;
  main_surf_spot_name?: string | null;
  main_surf_spot_distance_km?: number | null;
  main_surf_spot_walkable?: boolean;
  surf_schools?: Array<{ name: string; type: string; distance_km: number; pricing?: string }>;
  avg_accommodation_per_night?: number | null;
  avg_meal_cost?: number | null;
  budget_score_estimate?: number;
  noise_signals?: string[];
  sleep_score_estimate?: number;
  vibe_tags?: string[];
  vibe_score_estimate?: number;
  crowd_type?: string;
  requires_scooter_for_daily_life?: boolean;
  friction_note?: string;
  friction_score_estimate?: number;
  routine_score_estimate?: number;
}

async function llmFillEvidence(
  microArea: MicroAreaDef,
  cityName: string,
  country: string,
  googleResults: {
    cafes: GooglePlaceResult[];
    coworkings: GooglePlaceResult[];
    gyms: GooglePlaceResult[];
    restaurants: GooglePlaceResult[];
    grocery: GooglePlaceResult[];
    pharmacy: GooglePlaceResult[];
  }
): Promise<LLMFillResult> {
  const knownVenues = microArea.known_venues?.join(", ") ?? "none specified";
  const googleSummary = [
    `Cafés found: ${googleResults.cafes.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
    `Coworkings found: ${googleResults.coworkings.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
    `Gyms found: ${googleResults.gyms.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
    `Restaurants found: ${googleResults.restaurants.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
    `Grocery found: ${googleResults.grocery.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
    `Pharmacy found: ${googleResults.pharmacy.map((p) => p.displayName?.text ?? "unnamed").join(", ") || "none"}`,
  ].join("\n");

  const prompt = `You are building a structured evidence pack for a remote-worker location intelligence system.

Micro-area: ${microArea.name}
City: ${cityName}, ${country}
Description: ${microArea.description}
Tags: ${microArea.tags.join(", ")}
Known venues in this zone: ${knownVenues}

Google Places data found nearby:
${googleSummary}

Fill in the qualitative evidence fields below. Use your knowledge of ${cityName} to provide realistic estimates. 
Mark scores as lower (3-5) when data is thin or you're unsure.
Be HONEST — if this zone is known to have poor wifi or no infrastructure, reflect that.

Return ONLY a JSON object with these fields:
{
  "wifi_reputation": "strong|patchy|poor|unknown",
  "internet_score_estimate": <0-10>,
  "work_environment_notes": "<one sentence about working conditions in this zone>",
  "has_coliving": <true|false>,
  "coliving_name": "<name if known, else null>",
  "coliving_price_per_night": <number or null>,
  "main_surf_spot_name": "<name or null>",
  "main_surf_spot_distance_km": <number or null>,
  "main_surf_spot_walkable": <true|false>,
  "surf_schools": [{"name": "<name>", "type": "surf_school", "distance_km": <number>, "pricing": "<price or null>"}],
  "avg_accommodation_per_night": <number or null>,
  "avg_meal_cost": <number or null>,
  "budget_score_estimate": <0-10>,
  "noise_signals": ["<signal1>", "<signal2>"],
  "sleep_score_estimate": <0-10>,
  "vibe_tags": ["<tag1>", "<tag2>"],
  "vibe_score_estimate": <0-10>,
  "crowd_type": "<description of typical crowd>",
  "requires_scooter_for_daily_life": <true|false>,
  "friction_note": "<one sentence about daily friction in this zone>",
  "friction_score_estimate": <0-10>,
  "routine_score_estimate": <0-10>
}`;

  try {
    const response = await getClient().chat.completions.create({
      model: process.env.OPENAI_NARRATIVE_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return {};
    return JSON.parse(raw) as LLMFillResult;
  } catch {
    return {};
  }
}

// ── Assemble EvidencePack ─────────────────────────────────────────────────────

export async function gatherEvidenceForMicroArea(
  microArea: MicroAreaDef,
  cityName: string,
  country: string,
  citySlug?: string,
): Promise<EvidencePack> {
  const { lat, lon } = microArea.center;
  const radiusMeters = Math.round(microArea.radius_km * 1000);

  console.log(`[gatherEvidence] ${microArea.name} — searching Google Places (r=${microArea.radius_km}km)`);

  // Parallel Google Places Nearby searches
  const [cafes, coworkings, gyms, restaurants, grocery, pharmacy] = await Promise.all([
    searchNearby(lat, lon, "cafe", radiusMeters),
    searchNearby(lat, lon, "coworking_space", radiusMeters),
    searchNearby(lat, lon, "gym", radiusMeters + 1000),
    searchNearby(lat, lon, "restaurant", radiusMeters),
    searchNearby(lat, lon, "supermarket", radiusMeters + 2000),
    searchNearby(lat, lon, "pharmacy", radiusMeters + 2000),
  ]);

  // If Nearby returned very little, boost with Text Search for known venues
  const totalNearby = cafes.length + coworkings.length + gyms.length + restaurants.length;
  if (totalNearby < 3 && microArea.known_venues?.length) {
    console.log(`[gatherEvidence] ${microArea.name} — Nearby thin (${totalNearby}), trying Text Search for known venues`);
    const textResults = await Promise.all(
      (microArea.known_venues ?? []).slice(0, 4).map((venue) =>
        searchByText(`${venue} ${microArea.name} ${cityName}`, lat, lon)
      )
    );
    const flat = textResults.flat();
    // Merge text results into the appropriate buckets (treat all as cafes/food if unclassified)
    for (const p of flat) {
      if (!cafes.find((c) => c.id === p.id) && !restaurants.find((r) => r.id === p.id)) {
        cafes.push(p);
      }
    }
    console.log(`[gatherEvidence] ${microArea.name} — Text Search added ${flat.length} venues`);
  }

  const totalResults = cafes.length + coworkings.length + gyms.length + restaurants.length;
  const confidence: EvidencePack["confidence"] =
    totalResults >= 5 ? "high" : totalResults >= 2 ? "medium" : "low";

  console.log(
    `[gatherEvidence] ${microArea.name} — final: ${cafes.length} cafés, ${coworkings.length} coworks, ` +
    `${gyms.length} gyms, ${restaurants.length} restaurants (confidence: ${confidence})`
  );

  // LLM fills in qualitative fields (wifi rep, vibe, surf spots, etc.)
  const llm = await llmFillEvidence(microArea, cityName, country, {
    cafes, coworkings, gyms, restaurants, grocery, pharmacy,
  });

  // Non-blocking write-through to canonical DB (if configured)
  if (citySlug) {
    void persistZonePlacesAndMetrics(citySlug, {
      coworkings,
      cafes,
      gyms,
      restaurants,
      grocery,
      pharmacy,
    }).catch((err) => {
      console.warn("[gatherEvidence] place metric persistence failed:", err);
    });
  }

  const now = new Date().toISOString();

  // Helpers
  const distFrom = (p: GooglePlaceResult) =>
    p.location
      ? haversineKm(lat, lon, p.location.latitude, p.location.longitude)
      : 0.5;

  const toWorkCafe = (p: GooglePlaceResult) => ({
    name: p.displayName?.text ?? "Unknown",
    category: "cafe" as const,
    distance_km: distFrom(p),
    rating: p.rating,
    reviews_count: p.userRatingCount,
    confirmed_wifi: true,
    opening_hours: p.currentOpeningHours?.weekdayDescriptions ?? [],
  });

  const pack: EvidencePack = {
    micro_area_id: microArea.id,
    collected_at: now,
    confidence,

    work: {
      coworkings: coworkings.map((p) => ({
        name: p.displayName?.text ?? "Unknown",
        category: "coworking" as const,
        distance_km: distFrom(p),
        rating: p.rating,
        reviews_count: p.userRatingCount,
        confirmed_wifi: true,
        opening_hours: p.currentOpeningHours?.weekdayDescriptions ?? [],
      })),
      work_cafes: cafes.slice(0, 4).map(toWorkCafe),
      has_coliving_with_workspace: llm.has_coliving ?? false,
      coliving_name: llm.coliving_name ?? undefined,
      coliving_price_per_night: llm.coliving_price_per_night ?? undefined,
      best_wifi_confirmed: (llm.wifi_reputation === "strong"),
      wifi_review_mentions: llm.wifi_reputation
        ? [`${microArea.name}: wifi reputation is ${llm.wifi_reputation}`]
        : [],
      internet_score_estimate: typeof llm.internet_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.internet_score_estimate))
        : 5,
    },

    activity: {
      main_spot_distance_km: typeof llm.main_surf_spot_distance_km === "number"
        ? llm.main_surf_spot_distance_km
        : null,
      main_spot_name: llm.main_surf_spot_name ?? undefined,
      main_spot_walkable: llm.main_surf_spot_walkable ?? false,
      additional_spots: [],
      schools_or_rentals: (llm.surf_schools ?? []).map((s: { name: string; type: string; distance_km: number; pricing?: string }) => ({
        name: s.name,
        type: s.type,
        distance_km: s.distance_km,
        pricing: s.pricing ?? undefined,
      })),
      activity_score_estimate: llm.main_surf_spot_walkable
        ? 8
        : typeof llm.main_surf_spot_distance_km === "number" && llm.main_surf_spot_distance_km < 1.5
          ? 6
          : 4,
    },

    routine: {
      gym: gyms.length > 0
        ? { found: true, name: gyms[0].displayName?.text, distance_km: distFrom(gyms[0]), rating: gyms[0].rating }
        : { found: false },
      grocery: grocery.length > 0
        ? { found: true, name: grocery[0].displayName?.text, distance_km: distFrom(grocery[0]), walkable: distFrom(grocery[0]) < 0.6 }
        : { found: false, walkable: false },
      pharmacy: pharmacy.length > 0
        ? { found: true, name: pharmacy[0].displayName?.text, distance_km: distFrom(pharmacy[0]) }
        : { found: false },
      laundry: { found: false },
      routine_score_estimate: typeof llm.routine_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.routine_score_estimate))
        : 5,
    },

    friction: {
      work_spot_walkable: cafes.length > 0 ? distFrom(cafes[0]) < 0.5 : false,
      activity_walkable: llm.main_surf_spot_walkable ?? false,
      grocery_walkable: grocery.length > 0 ? distFrom(grocery[0]) < 0.6 : false,
      requires_scooter_for_daily_life: llm.requires_scooter_for_daily_life ?? true,
      requires_car_for_any_essential: grocery.length === 0 && pharmacy.length === 0,
      typical_daily_friction_note: llm.friction_note ?? `Getting around ${microArea.name} requires transport planning`,
      friction_score_estimate: typeof llm.friction_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.friction_score_estimate))
        : 5,
    },

    accommodation: {
      options: llm.has_coliving && llm.coliving_name
        ? [{
            name: llm.coliving_name,
            type: "coliving" as const,
            price_per_night: llm.coliving_price_per_night ?? undefined,
            has_workspace: true,
            has_fast_wifi: llm.wifi_reputation === "strong",
          }]
        : [],
      has_coliving: llm.has_coliving ?? false,
      price_range_per_night: typeof llm.avg_accommodation_per_night === "number"
        ? { min: Math.round(llm.avg_accommodation_per_night * 0.7), max: Math.round(llm.avg_accommodation_per_night * 1.5) }
        : null,
      best_for_work_option: llm.coliving_name ?? coworkings[0]?.displayName?.text ?? cafes[0]?.displayName?.text ?? undefined,
    },

    food: {
      cafes: cafes.slice(0, 4).map((p) => ({
        name: p.displayName?.text ?? "Unknown",
        distance_km: distFrom(p),
        laptop_friendly: true,
        rating: p.rating,
      })),
      restaurants: restaurants.slice(0, 4).map((p) => ({
        name: p.displayName?.text ?? "Unknown",
        distance_km: distFrom(p),
        rating: p.rating,
      })),
      food_score_estimate: restaurants.length >= 3 ? 7 : restaurants.length >= 1 ? 5 : 3,
    },

    sleep: {
      noise_signals: Array.isArray(llm.noise_signals) ? llm.noise_signals : [],
      sleep_score_estimate: typeof llm.sleep_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.sleep_score_estimate))
        : 6,
      note: `${microArea.name} — ${(llm.noise_signals ?? []).join("; ") || "no noise data"}`,
    },

    budget: {
      avg_accommodation_per_night: typeof llm.avg_accommodation_per_night === "number"
        ? llm.avg_accommodation_per_night
        : null,
      avg_meal_cost: typeof llm.avg_meal_cost === "number" ? llm.avg_meal_cost : null,
      budget_score_estimate: typeof llm.budget_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.budget_score_estimate))
        : 5,
    },

    vibe: {
      crowd_type: llm.crowd_type ?? "mixed traveler crowd",
      vibe_tags: Array.isArray(llm.vibe_tags) ? llm.vibe_tags : microArea.tags,
      vibe_score_estimate: typeof llm.vibe_score_estimate === "number"
        ? Math.min(10, Math.max(0, llm.vibe_score_estimate))
        : 6,
    },
  };

  // Validate before returning — catches any shape mismatches early
  return EvidencePackSchema.parse(pack);
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

async function persistZonePlacesAndMetrics(
  citySlug: string,
  buckets: {
    coworkings: GooglePlaceResult[];
    cafes: GooglePlaceResult[];
    gyms: GooglePlaceResult[];
    restaurants: GooglePlaceResult[];
    grocery: GooglePlaceResult[];
    pharmacy: GooglePlaceResult[];
  },
): Promise<void> {
  const destination = await canonicalRepository.getDestinationBySlug(citySlug);
  if (!destination) return;

  const merged = [
    ...buckets.coworkings.map((p) => ({ place: p, category: "coworking" as const })),
    ...buckets.cafes.map((p) => ({ place: p, category: "cafe" as const })),
    ...buckets.gyms.map((p) => ({ place: p, category: "gym" as const })),
    ...buckets.restaurants.map((p) => ({ place: p, category: "food" as const })),
    ...buckets.grocery.map((p) => ({ place: p, category: "other" as const })),
    ...buckets.pharmacy.map((p) => ({ place: p, category: "other" as const })),
  ];

  const seen = new Set<string>();
  const unique = merged.filter((entry) => {
    if (!entry.place.id || seen.has(entry.place.id)) return false;
    seen.add(entry.place.id);
    return true;
  });

  await Promise.all(
    unique.map(async ({ place, category }) => {
      const name = place.displayName?.text ?? "Unknown";
      const saved = await canonicalRepository.upsertPlaceByExternalId({
        destinationId: destination.id,
        externalPlaceId: place.id,
        name,
        normalizedName: normalizeName(name),
        category,
        lat: place.location?.latitude ?? null,
        lon: place.location?.longitude ?? null,
        address: place.formattedAddress ?? null,
        websiteUri: place.websiteUri ?? null,
      });
      if (!saved) return;
      await canonicalRepository.upsertPlaceMetric({
        placeId: saved.id,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        openingHoursJson: place.currentOpeningHours?.weekdayDescriptions ?? null,
        source: "google_places",
        refreshedAt: new Date(),
      });
    }),
  );
}
