/**
 * Popoyo, Nicaragua — fixture data for all 3 micro-areas.
 *
 * Sources: Google Places reviews, wavesandwifi.com, local knowledge.
 * Last updated: 2025.
 *
 * Micro-areas:
 *   1. Guasacate — main surf village, walkable beach access, Waves&Wifi coliving
 *   2. South Playa Popoyo — quieter beach, resort area, poor work infra
 *   3. Santana / Rancho Santana — premium resort, bundled surf+work+gym, expensive
 */

import type { EvidencePack } from "@/schemas/zod/evidencePack.schema";

export const POPOYO_MICRO_AREAS = [
  {
    id: "popoyo-guasacate",
    name: "Guasacate",
    destination: "Popoyo, Nicaragua",
    // Guasacate / main Popoyo surf village area
    center: { lat: 11.4756, lon: -86.1239 },
    radius_km: 0.7,
    description: "Main surf village — walkable break, Waves & Wifi coliving, Kooks Cafe",
    tags: ["surf_village", "walkable", "social", "budget_friendly"],
  },
  {
    id: "popoyo-south-playa",
    name: "South Playa Popoyo",
    destination: "Popoyo, Nicaragua",
    // South stretch of Playa Popoyo (quieter beach frontage)
    center: { lat: 11.4687, lon: -86.1184 },
    radius_km: 0.75,
    description: "Quieter beach area with basic guesthouses — scooter required for work spots",
    tags: ["quiet", "remote", "scooter_required", "budget_friendly"],
  },
  {
    id: "popoyo-santana",
    name: "Santana / Rancho Santana",
    destination: "Popoyo, Nicaragua",
    // Rancho Santana private development inland/south of Popoyo core
    center: { lat: 11.4448, lon: -86.0890 },
    radius_km: 1.1,
    description: "Premium private resort — bundled surf, workspace, gym, restaurant on-site",
    tags: ["premium", "bundled_infra", "quiet", "social"],
  },
] as const;

const NOW = new Date().toISOString();

export const POPOYO_EVIDENCE: Record<string, EvidencePack> = {
  "popoyo-guasacate": {
    micro_area_id: "popoyo-guasacate",
    collected_at: NOW,
    confidence: "medium",

    work: {
      coworkings: [],
      work_cafes: [
        {
          name: "Kooks Cafe",
          category: "cafe",
          distance_km: 0.2,
          rating: 4.9,
          reviews_count: 348,
          confirmed_wifi: true,
          opening_hours: ["Monday–Sunday: 7:00 AM – 5:00 PM"],
          notable_review: "Reliable wifi, good for a few work hours in the morning. Closes at 5pm.",
        },
        {
          name: "Cafe Cerveza Popoyo",
          category: "cafe",
          distance_km: 0.3,
          rating: 4.6,
          reviews_count: 194,
          confirmed_wifi: false,
          opening_hours: ["Monday–Sunday: 8:00 AM – 10:00 PM"],
        },
      ],
      has_coliving_with_workspace: true,
      coliving_name: "Waves & Wifi",
      coliving_price_per_night: 50,
      best_wifi_confirmed: true,
      wifi_review_mentions: [
        "Fast wifi, worked well for video calls",
        "Workspace area is quiet and functional",
        "Good internet — one of the few places with reliable connection",
      ],
      internet_score_estimate: 7,
    },

    activity: {
      main_spot_distance_km: 0.1,
      main_spot_name: "Guasacate surf break",
      main_spot_walkable: true,
      additional_spots: [
        { name: "Popoyo surf break", distance_km: 1.2, walkable: false },
        { name: "Santana reef", distance_km: 2.5, walkable: false },
      ],
      schools_or_rentals: [
        {
          name: "Sardina Surf School",
          type: "surf_school",
          distance_km: 0.3,
          pricing: "$35/lesson",
          rating: 5.0,
        },
        {
          name: "Popoyo Surfcamp",
          type: "surf_camp",
          distance_km: 0.4,
          rating: 4.9,
        },
      ],
      seasonal_note: "Best surf Nov–Apr. Smaller waves May–Oct but still surfable.",
      activity_score_estimate: 9,
    },

    routine: {
      gym: { found: false },
      grocery: {
        found: true,
        name: "Local mini-market",
        distance_km: 0.4,
        walkable: true,
      },
      pharmacy: { found: false },
      laundry: { found: true, distance_km: 0.5 },
      routine_score_estimate: 4,
    },

    friction: {
      work_spot_walkable: true,    // Waves & Wifi + Kooks Cafe
      activity_walkable: true,     // surf break 100m
      grocery_walkable: true,
      requires_scooter_for_daily_life: false,
      requires_car_for_any_essential: false,
      typical_daily_friction_note: "Surf, work, and basic food all within 5 min walk. No pharmacy — scooter or ride needed for medical needs and larger grocery runs.",
      friction_score_estimate: 8,
    },

    accommodation: {
      options: [
        {
          name: "Waves & Wifi",
          type: "coliving",
          price_per_night: 50,
          has_workspace: true,
          has_fast_wifi: true,
          distance_to_activity_km: 0.1,
          rating: 4.9,
          notable_review: "Best place to stay if you want to surf and work. Workspace is solid, wifi is the best in the area.",
        },
        {
          name: "Popoyo Surfcamp",
          type: "hostel",
          price_per_night: 35,
          has_workspace: false,
          has_fast_wifi: false,
          distance_to_activity_km: 0.4,
          rating: 4.9,
        },
      ],
      has_coliving: true,
      price_range_per_night: { min: 35, max: 65 },
      best_for_work_option: "Waves & Wifi",
    },

    food: {
      cafes: [
        {
          name: "Kooks Cafe",
          distance_km: 0.2,
          laptop_friendly: true,
          rating: 4.9,
          opens_at: "07:00",
        },
        {
          name: "Cafe Cerveza Popoyo",
          distance_km: 0.3,
          laptop_friendly: false,
          rating: 4.6,
          opens_at: "08:00",
        },
      ],
      restaurants: [
        { name: "Hotel cafe con leche", distance_km: 0.3, rating: 4.8 },
        { name: "Magnific Rock restaurant", distance_km: 1.2, rating: 4.4 },
      ],
      food_score_estimate: 5.5,
    },

    sleep: {
      noise_signals: [
        "Roosters early morning",
        "Quiet at night",
        "No nightlife noise",
      ],
      sleep_score_estimate: 7,
      note: "Rural village — expect early morning animal sounds but no party noise.",
    },

    budget: {
      avg_accommodation_per_night: 50,
      avg_meal_cost: 8,
      budget_score_estimate: 7,
      note: "Mid-range for the region. Waves & Wifi at $50/night is competitive for surf+workspace bundle.",
    },

    vibe: {
      crowd_type: "Surfers, remote workers, backpackers",
      vibe_tags: ["surf_village", "social", "community", "walkable", "laid_back"],
      vibe_score_estimate: 8,
    },
  },

  "popoyo-south-playa": {
    micro_area_id: "popoyo-south-playa",
    collected_at: NOW,
    confidence: "low",

    work: {
      coworkings: [],
      work_cafes: [],
      has_coliving_with_workspace: false,
      best_wifi_confirmed: false,
      wifi_review_mentions: [],
      internet_score_estimate: 2,
    },

    activity: {
      main_spot_distance_km: 0.3,
      main_spot_name: "Popoyo beach",
      main_spot_walkable: true,
      additional_spots: [],
      schools_or_rentals: [],
      activity_score_estimate: 7.5,
    },

    routine: {
      gym: { found: false },
      grocery: { found: false, walkable: false },
      pharmacy: { found: false },
      laundry: { found: false },
      routine_score_estimate: 1,
    },

    friction: {
      work_spot_walkable: false,
      activity_walkable: true,
      grocery_walkable: false,
      requires_scooter_for_daily_life: true,
      requires_car_for_any_essential: false,
      typical_daily_friction_note: "Beach is walkable but all other essentials require a scooter — work spots, food, and groceries all require transport to Guasacate.",
      friction_score_estimate: 3,
    },

    accommodation: {
      options: [
        {
          name: "Basic guesthouses",
          type: "guesthouse",
          price_per_night: 25,
          has_workspace: false,
          has_fast_wifi: false,
        },
      ],
      has_coliving: false,
      price_range_per_night: { min: 20, max: 40 },
    },

    food: {
      cafes: [],
      restaurants: [{ name: "Small local sodas", distance_km: 0.5, rating: undefined }],
      food_score_estimate: 2,
    },

    sleep: {
      noise_signals: ["Very quiet", "Remote beach"],
      sleep_score_estimate: 9,
    },

    budget: {
      avg_accommodation_per_night: 25,
      avg_meal_cost: 5,
      budget_score_estimate: 9,
      note: "Cheapest option in the area but requires scooter spend for daily life.",
    },

    vibe: {
      crowd_type: "Budget surfers, backpackers",
      vibe_tags: ["quiet", "remote", "isolated", "nature"],
      vibe_score_estimate: 7,
    },
  },

  "popoyo-santana": {
    micro_area_id: "popoyo-santana",
    collected_at: NOW,
    confidence: "medium",

    work: {
      coworkings: [
        {
          name: "Rancho Santana business center",
          category: "coworking",
          distance_km: 0.1,
          confirmed_wifi: true,
          notable_review: "Fast fiber internet, AC, proper desks. Included for guests.",
        },
      ],
      work_cafes: [],
      has_coliving_with_workspace: false,
      best_wifi_confirmed: true,
      wifi_review_mentions: [
        "Best wifi I found in the whole Popoyo area",
        "Fiber internet — worked great for calls",
        "AC workspace, proper chairs",
      ],
      internet_score_estimate: 9,
    },

    activity: {
      main_spot_distance_km: 0.3,
      main_spot_name: "Santana private reef break",
      main_spot_walkable: true,
      additional_spots: [
        { name: "Popoyo break (access via shuttle)", distance_km: 3.0, walkable: false },
      ],
      schools_or_rentals: [
        {
          name: "Rancho Santana surf school",
          type: "surf_school",
          distance_km: 0.1,
          pricing: "$50/lesson",
        },
      ],
      activity_score_estimate: 8.5,
    },

    routine: {
      gym: {
        found: true,
        name: "Rancho Santana gym",
        distance_km: 0.1,
        rating: 4.5,
      },
      grocery: {
        found: true,
        name: "Resort shop",
        distance_km: 0.1,
        walkable: true,
      },
      pharmacy: {
        found: false,
      },
      laundry: { found: true, distance_km: 0.1 },
      routine_score_estimate: 8,
    },

    friction: {
      work_spot_walkable: true,
      activity_walkable: true,
      grocery_walkable: true,
      requires_scooter_for_daily_life: false,
      requires_car_for_any_essential: false,
      typical_daily_friction_note: "Fully self-contained resort — surf, work, gym, food, grocery all on-property. No need to leave unless you want to explore.",
      friction_score_estimate: 9.5,
    },

    accommodation: {
      options: [
        {
          name: "Rancho Santana villas",
          type: "hotel",
          price_per_night: 180,
          has_workspace: true,
          has_fast_wifi: true,
          distance_to_activity_km: 0.3,
          rating: 4.4,
          notable_review: "Worth it for the wifi and gym combo. Not cheap but it works.",
        },
      ],
      has_coliving: false,
      price_range_per_night: { min: 140, max: 250 },
      best_for_work_option: "Rancho Santana villas",
    },

    food: {
      cafes: [
        {
          name: "Rancho Santana cafe",
          distance_km: 0.1,
          laptop_friendly: true,
          rating: 4.2,
          opens_at: "07:00",
        },
      ],
      restaurants: [
        { name: "Rancho Santana restaurant", distance_km: 0.1, rating: 4.3 },
      ],
      food_score_estimate: 7,
    },

    sleep: {
      noise_signals: ["Very quiet resort", "Private property — no outside noise"],
      sleep_score_estimate: 9.5,
    },

    budget: {
      avg_accommodation_per_night: 180,
      avg_meal_cost: 20,
      budget_score_estimate: 4,
      note: "Premium pricing — justified for bundled infra but not budget-friendly.",
    },

    vibe: {
      crowd_type: "Premium travelers, families, remote workers with budget",
      vibe_tags: ["quiet", "premium", "bundled_infra", "nature"],
      vibe_score_estimate: 7,
    },
  },
};
