/**
 * Curated neighborhoods for multi-neighborhood cities.
 * When a user searches one of these city slugs, we show a neighborhood
 * discovery grid instead of a single city-wide place list.
 *
 * bbox order: [south, west, north, east] — matches Overpass / City type.
 */

export interface NeighborhoodEntry {
  name: string;
  slug: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
  tagline: string;
  /** Cardinal direction from city center */
  directionFromCenter: "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | "Center";
  distanceFromCenterKm: number;
}

export interface CityNeighborhoodConfig {
  cityName: string;
  citySlug: string;
  neighborhoods: NeighborhoodEntry[];
}

/**
 * Curated neighborhoods for major remote-work cities.
 * These take priority over auto-discovery and include editorial taglines.
 * For all other cities, discoverNeighborhoods() is called automatically.
 */
export const CURATED_NEIGHBORHOODS: Record<string, CityNeighborhoodConfig> = {
  "buenos-aires": {
    cityName: "Buenos Aires",
    citySlug: "buenos-aires",
    neighborhoods: [
      {
        name: "Palermo",
        slug: "palermo",
        lat: -34.5755,
        lon: -58.4295,
        bbox: [-34.595, -58.455, -34.556, -58.404],
        tagline: "High café density, coworkings, and a lively but workable vibe",
        directionFromCenter: "NW",
        distanceFromCenterKm: 5,
      },
      {
        name: "San Telmo",
        slug: "san-telmo",
        lat: -34.6218,
        lon: -58.373,
        bbox: [-34.634, -58.388, -34.609, -58.358],
        tagline: "Historic, character-filled, good café options near the center",
        directionFromCenter: "SE",
        distanceFromCenterKm: 2.4,
      },
      {
        name: "Villa Crespo",
        slug: "villa-crespo",
        lat: -34.5973,
        lon: -58.4412,
        bbox: [-34.610, -58.458, -34.584, -58.424],
        tagline: "Relaxed, local feel with a growing remote-work café scene",
        directionFromCenter: "W",
        distanceFromCenterKm: 5.5,
      },
      {
        name: "Recoleta",
        slug: "recoleta",
        lat: -34.5875,
        lon: -58.3927,
        bbox: [-34.600, -58.408, -34.575, -58.377],
        tagline: "Polished, central, and close to everything",
        directionFromCenter: "N",
        distanceFromCenterKm: 1.8,
      },
      {
        name: "Belgrano",
        slug: "belgrano",
        lat: -34.5614,
        lon: -58.4556,
        bbox: [-34.573, -58.470, -34.549, -58.441],
        tagline: "Quieter residential base with solid food and café options",
        directionFromCenter: "NW",
        distanceFromCenterKm: 6.4,
      },
    ],
  },

  "mexico-city": {
    cityName: "Mexico City",
    citySlug: "mexico-city",
    neighborhoods: [
      {
        name: "Roma Norte",
        slug: "roma-norte",
        lat: 19.4189,
        lon: -99.1636,
        bbox: [19.410, -99.175, 19.428, -99.152],
        tagline: "The remote-worker hub — dense cafés, coworkings, excellent food",
        directionFromCenter: "SW",
        distanceFromCenterKm: 3.5,
      },
      {
        name: "Condesa",
        slug: "condesa",
        lat: 19.412,
        lon: -99.1736,
        bbox: [19.403, -99.185, 19.421, -99.162],
        tagline: "Tree-lined streets, café terraces, great for deep work",
        directionFromCenter: "SW",
        distanceFromCenterKm: 5.1,
      },
      {
        name: "Polanco",
        slug: "polanco",
        lat: 19.431,
        lon: -99.1956,
        bbox: [19.422, -99.208, 19.440, -99.183],
        tagline: "Upscale, quiet, and well-served for routine and work",
        directionFromCenter: "W",
        distanceFromCenterKm: 6.5,
      },
      {
        name: "Juárez",
        slug: "juarez",
        lat: 19.4254,
        lon: -99.1641,
        bbox: [19.417, -99.175, 19.433, -99.153],
        tagline: "Walkable, central, and buzzing with cafés and coworkings",
        directionFromCenter: "SW",
        distanceFromCenterKm: 3.4,
      },
      {
        name: "Del Valle",
        slug: "del-valle",
        lat: 19.3935,
        lon: -99.1698,
        bbox: [19.385, -99.180, 19.402, -99.159],
        tagline: "Residential and calm — good for a focused, low-distraction stay",
        directionFromCenter: "S",
        distanceFromCenterKm: 6.3,
      },
    ],
  },

  bangkok: {
    cityName: "Bangkok",
    citySlug: "bangkok",
    neighborhoods: [
      {
        name: "Thonglor",
        slug: "thonglor",
        lat: 13.7261,
        lon: 100.5867,
        bbox: [13.718, 100.578, 13.734, 100.596],
        tagline: "Bangkok's nomad hub — specialty cafés, coworkings, and nightlife",
        directionFromCenter: "SE",
        distanceFromCenterKm: 5.6,
      },
      {
        name: "Ari",
        slug: "ari",
        lat: 13.7756,
        lon: 100.5466,
        bbox: [13.767, 100.538, 13.784, 100.555],
        tagline: "Low-key, café-dense, BTS access — ideal for focused work days",
        directionFromCenter: "N",
        distanceFromCenterKm: 3.6,
      },
      {
        name: "Silom",
        slug: "silom",
        lat: 13.7263,
        lon: 100.5285,
        bbox: [13.719, 100.520, 13.734, 100.537],
        tagline: "Business district with good coworking options and food variety",
        directionFromCenter: "S",
        distanceFromCenterKm: 2.2,
      },
      {
        name: "Sukhumvit",
        slug: "sukhumvit",
        lat: 13.737,
        lon: 100.5598,
        bbox: [13.729, 100.551, 13.745, 100.569],
        tagline: "Convenient, international, everything within walking distance",
        directionFromCenter: "E",
        distanceFromCenterKm: 3.4,
      },
    ],
  },

  london: {
    cityName: "London",
    citySlug: "london",
    neighborhoods: [
      {
        name: "Shoreditch",
        slug: "shoreditch",
        lat: 51.5228,
        lon: -0.0793,
        bbox: [51.515, -0.092, 51.531, -0.067],
        tagline: "Tech and creative hub — coworkings, specialty cafés, good energy",
        directionFromCenter: "NE",
        distanceFromCenterKm: 4.2,
      },
      {
        name: "Brixton",
        slug: "brixton",
        lat: 51.4627,
        lon: -0.1145,
        bbox: [51.455, -0.126, 51.470, -0.103],
        tagline: "Vibrant and affordable with a growing café and food scene",
        directionFromCenter: "S",
        distanceFromCenterKm: 5.1,
      },
      {
        name: "Peckham",
        slug: "peckham",
        lat: 51.474,
        lon: -0.0695,
        bbox: [51.466, -0.080, 51.481, -0.059],
        tagline: "Creative, local, and increasingly remote-work friendly",
        directionFromCenter: "SE",
        distanceFromCenterKm: 6.4,
      },
      {
        name: "Dalston",
        slug: "dalston",
        lat: 51.5463,
        lon: -0.0754,
        bbox: [51.538, -0.087, 51.554, -0.064],
        tagline: "Edgy, affordable, with good independent cafés and food",
        directionFromCenter: "NE",
        distanceFromCenterKm: 7.3,
      },
    ],
  },

  berlin: {
    cityName: "Berlin",
    citySlug: "berlin",
    neighborhoods: [
      {
        name: "Neukölln",
        slug: "neukolln",
        lat: 52.4768,
        lon: 13.4355,
        bbox: [52.468, 13.425, 52.486, 13.446],
        tagline: "Affordable, diverse, and packed with independent cafés and coworkings",
        directionFromCenter: "SE",
        distanceFromCenterKm: 6.8,
      },
      {
        name: "Prenzlauer Berg",
        slug: "prenzlauer-berg",
        lat: 52.5399,
        lon: 13.4138,
        bbox: [52.531, 13.403, 52.549, 13.425],
        tagline: "Leafy, café-rich, and a reliable remote-work base",
        directionFromCenter: "NE",
        distanceFromCenterKm: 3.7,
      },
      {
        name: "Kreuzberg",
        slug: "kreuzberg",
        lat: 52.4968,
        lon: 13.4031,
        bbox: [52.488, 13.393, 52.506, 13.414],
        tagline: "Creative and buzzy with solid work cafés and good food",
        directionFromCenter: "SE",
        distanceFromCenterKm: 2.4,
      },
      {
        name: "Friedrichshain",
        slug: "friedrichshain",
        lat: 52.5133,
        lon: 13.4543,
        bbox: [52.505, 13.444, 52.522, 13.465],
        tagline: "Young, energetic, strong café scene near the Spree",
        directionFromCenter: "E",
        distanceFromCenterKm: 5.4,
      },
      {
        name: "Mitte",
        slug: "mitte",
        lat: 52.5248,
        lon: 13.4011,
        bbox: [52.516, 13.388, 52.533, 13.414],
        tagline: "Central and walkable — good coworkings and everything nearby",
        directionFromCenter: "Center",
        distanceFromCenterKm: 1.7,
      },
    ],
  },
};
