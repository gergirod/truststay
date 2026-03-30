/**
 * discoverMicroAreas — LLM-powered micro-area discovery for any destination.
 *
 * Given a destination name + country, asks the LLM to identify 3–4 distinct
 * neighborhood zones that are relevant to a remote-working traveler.
 *
 * Returns structured MicroAreaDef objects with coordinates and tags, ready
 * to be passed to the evidence-gathering and scoring pipeline.
 *
 * This replaces hardcoded fixtures for all non-bootstrapped destinations.
 */

import OpenAI from "openai";
import { z } from "zod";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// ── Output schema ─────────────────────────────────────────────────────────────

export const MicroAreaDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  center: z.object({ lat: z.number(), lon: z.number() }),
  radius_km: z.number(),
  tags: z.array(z.string()),
  known_venues: z.array(z.string()).optional(),
});

export type MicroAreaDef = z.infer<typeof MicroAreaDefSchema>;

const DiscoveryResponseSchema = z.object({
  micro_areas: z.array(MicroAreaDefSchema).min(1).max(6),
  destination_context: z.string(),
});

const MAX_ZONE_DISTANCE_FROM_DESTINATION_KM = 22;
const DEFAULT_LOCATION_BIAS_RADIUS_M = 35000;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TextSearchPlace {
  location?: { latitude: number; longitude: number };
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
}

async function searchText(
  apiKey: string,
  query: string,
  maxResultCount: number,
  locationBias?: { lat: number; lon: number; radiusM?: number },
): Promise<TextSearchPlace[]> {
  const body: {
    textQuery: string;
    maxResultCount: number;
    locationBias?: {
      circle: {
        center: { latitude: number; longitude: number };
        radius: number;
      };
    };
  } = {
    textQuery: query,
    maxResultCount,
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.lat,
          longitude: locationBias.lon,
        },
        radius: locationBias.radiusM ?? DEFAULT_LOCATION_BIAS_RADIUS_M,
      },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.location,places.displayName,places.formattedAddress,places.primaryType",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: TextSearchPlace[] };
  return data.places ?? [];
}

async function resolveDestinationAnchor(
  cityName: string,
  country: string,
): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const places = await searchText(apiKey, `${cityName} ${country}`, 1);
    const loc = places[0]?.location;
    if (!loc) return null;
    return { lat: loc.latitude, lon: loc.longitude };
  } catch {
    return null;
  }
}

function normalizeZoneName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function isBusinessLikeZoneName(name: string): boolean {
  const n = name.toLowerCase();
  return /(hotel|hostel|resort|beach house|beach club|villa|lodge|cafe|restaurant|school|camp|coliving|cowork|house)/i.test(
    n,
  );
}

function isBusinessLikePrimaryType(primaryType?: string): boolean {
  if (!primaryType) return false;
  return [
    "lodging",
    "hotel",
    "resort_hotel",
    "hostel",
    "restaurant",
    "cafe",
    "bar",
    "gym",
    "school",
  ].includes(primaryType);
}

function dedupeZonesByName(zones: MicroAreaDef[]): MicroAreaDef[] {
  const seen = new Set<string>();
  const out: MicroAreaDef[] = [];
  for (const zone of zones) {
    const key = zone.name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(zone);
  }
  return out;
}

function dedupeZonesByProximity(
  zones: MicroAreaDef[],
  minDistanceKm = 1.2,
): MicroAreaDef[] {
  const kept: MicroAreaDef[] = [];
  for (const zone of zones) {
    const overlaps = kept.some((k) => {
      const d = haversineKm(
        k.center.lat,
        k.center.lon,
        zone.center.lat,
        zone.center.lon,
      );
      return d < minDistanceKm;
    });
    if (!overlaps) kept.push(zone);
  }
  return kept;
}

// ── Geocoding: snap LLM coords to real GPS via Google Places Text Search ──────

async function geocodeZone(
  zone: MicroAreaDef,
  cityName: string,
  country: string,
  anchor?: { lat: number; lon: number } | null,
): Promise<MicroAreaDef> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return zone;

  try {
    const query = `${zone.name}, ${cityName}, ${country}`;
    const candidates = await searchText(
      apiKey,
      query,
      5,
      anchor ? { lat: anchor.lat, lon: anchor.lon } : undefined,
    );

    if (!candidates.length) return zone;

    const withLocations = candidates.filter(
      (p): p is TextSearchPlace & { location: { latitude: number; longitude: number } } =>
        Boolean(p.location),
    );
    if (!withLocations.length) return zone;

    // Prefer non-business places for zone geocoding (avoid snapping to hotels/resorts/cafes)
    const zoneLikeCandidates = withLocations.filter(
      (p) =>
        !isBusinessLikePrimaryType(p.primaryType) &&
        !isBusinessLikeZoneName(p.displayName?.text ?? ""),
    );

    let chosen = zoneLikeCandidates[0] ?? withLocations[0];
    if (anchor) {
      chosen = withLocations.reduce((best, current) => {
        const dBest = haversineKm(
          anchor.lat,
          anchor.lon,
          best.location.latitude,
          best.location.longitude,
        );
        const dCurrent = haversineKm(
          anchor.lat,
          anchor.lon,
          current.location.latitude,
          current.location.longitude,
        );
        return dCurrent < dBest ? current : best;
      });

      const distFromAnchor = haversineKm(
        anchor.lat,
        anchor.lon,
        chosen.location.latitude,
        chosen.location.longitude,
      );

      if (distFromAnchor > MAX_ZONE_DISTANCE_FROM_DESTINATION_KM) {
        console.warn(
          `[discoverMicroAreas] ignoring far geocode for "${zone.name}" (${distFromAnchor.toFixed(
            1,
          )}km from destination anchor)`,
        );
        return zone;
      }
    }

    const lat = chosen.location.latitude;
    const lon = chosen.location.longitude;
    console.log(
      `[discoverMicroAreas] geocoded "${zone.name}" → (${lat.toFixed(4)}, ${lon.toFixed(
        4,
      )}) (was ${zone.center.lat.toFixed(4)}, ${zone.center.lon.toFixed(4)})`,
    );
    return {
      ...zone,
      name: normalizeZoneName(zone.name),
      center: { lat, lon },
    };
  } catch {
    return zone; // keep LLM coords on failure
  }
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function discoverMicroAreas(
  cityName: string,
  country: string,
  mainActivity: string,
): Promise<MicroAreaDef[]> {
  const prompt = `You are a location intelligence agent with deep knowledge of surf and remote work destinations worldwide.

Destination: ${cityName}, ${country}
Traveler's main activity: ${mainActivity}

TASK: Identify 3–4 REAL, NAMED neighborhood zones within "${cityName}" that a remote worker should compare as a base.

CRITICAL RULES:
1. Use REAL local neighborhood names (e.g. Santa Teresa: "Carmen", "Mal País", "Santa Teresa Norte"; Popoyo: "Guasacate", "Playa Popoyo", "Rancho Santana") — NOT "Surf Village" or "Quiet Beach"
1b. Avoid generic labels like "Main", "Central", "Village", "North/South" unless locals actually use that as the real name.
2. Coordinates must be ACCURATE GPS coordinates for the CENTER of that specific neighborhood
3. known_venues: list 3–5 REAL venues that actually exist in that zone (cafés, coworkings, surf schools, coliving spaces, gyms, restaurants) — use your training knowledge
4. Include zones with HONEST different tradeoffs — don't make all zones sound similar
5. If a zone is weak for remote work (no wifi, no services), tag it accurately and mark it honestly

tags — choose from: surf_village, walkable, social, quiet, premium, budget_friendly, scooter_required, remote, bundled_infra, local, party, work_friendly, resort, thin_infrastructure

Return ONLY a JSON object:
{
  "micro_areas": [
    {
      "id": "real-neighborhood-slug",
      "name": "Real Neighborhood Name",
      "description": "One honest sentence about this zone for a remote worker doing ${mainActivity}",
      "center": { "lat": <accurate GPS lat>, "lon": <accurate GPS lon> },
      "radius_km": <0.5–2.0>,
      "tags": ["tag1", "tag2"],
      "known_venues": ["Real Venue 1", "Real Venue 2", "Real Venue 3"]
    }
  ],
  "destination_context": "One sentence summarizing ${cityName} for remote workers doing ${mainActivity}"
}`;

  try {
    const response = await getClient().chat.completions.create({
      model: process.env.OPENAI_NARRATIVE_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty LLM response");

    const parsed = JSON.parse(raw);
    const validated = DiscoveryResponseSchema.parse(parsed);

    console.log(
      `[discoverMicroAreas] ${cityName}: found ${validated.micro_areas.length} zones — ` +
      validated.micro_areas.map((m) => m.name).join(", ")
    );

    const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const zones = validated.micro_areas.map((m) => ({
      ...m,
      name: normalizeZoneName(m.name),
      id: `${slug}-${m.id}`.replace(/--+/g, "-"),
    }));

    const destinationAnchor = await resolveDestinationAnchor(cityName, country);

    // Geocode each zone to get accurate GPS (LLM coords can be off)
    const geocoded = await Promise.all(
      zones.map((z) => geocodeZone(z, cityName, country, destinationAnchor))
    );

    // Keep zones near destination anchor; fallback to original if filtering is too strict
    const filtered =
      destinationAnchor
        ? geocoded.filter((z) => {
            const d = haversineKm(
              destinationAnchor.lat,
              destinationAnchor.lon,
              z.center.lat,
              z.center.lon,
            );
            return d <= MAX_ZONE_DISTANCE_FROM_DESTINATION_KM;
          })
        : geocoded;

    const cleaned = filtered.filter((z) => !isBusinessLikeZoneName(z.name));
    const usable = cleaned.length >= 2 ? cleaned : (filtered.length >= 2 ? filtered : geocoded);
    const byName = dedupeZonesByName(usable);
    const byProximity = dedupeZonesByProximity(byName);
    return byProximity.slice(0, 4);
  } catch (err) {
    console.error("[discoverMicroAreas] failed:", err);
    // Fallback: single central area so the pipeline doesn't crash
    const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return [
      {
        id: `${slug}-central`,
        name: `Central ${cityName}`,
        description: `Central area of ${cityName} — micro-area discovery unavailable`,
        center: { lat: 0, lon: 0 },
        radius_km: 1.5,
        tags: [],
        known_venues: [],
      },
    ];
  }
}
