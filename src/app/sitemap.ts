import type { MetadataRoute } from "next";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";

const KNOWN_CITY_SLUGS = [
  // Major multi-neighborhood cities
  "lisbon", "medellin", "bali", "mexico-city", "buenos-aires",
  "chiang-mai", "berlin", "barcelona", "amsterdam", "ho-chi-minh-city",
  "tbilisi", "budapest", "prague", "bansko", "bogota",
  "taipei", "kuala-lumpur",
  // Mexico
  "playa-del-carmen", "oaxaca", "puerto-escondido", "sayulita",
  // El Salvador
  "el-tunco", "el-zonte",
  // Nicaragua
  "san-juan-del-sur", "popoyo",
  // Costa Rica
  "santa-teresa", "nosara", "tamarindo", "puerto-viejo",
  // Panama
  "bocas-del-toro", "boquete",
  // Guatemala
  "antigua-guatemala",
  // Ecuador
  "montanita", "olon", "banos",
  // Colombia
  "minca",
  // Peru
  "mancora",
  // Brazil
  "florianopolis", "itacare", "jericoacoara",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://truststay.co";

  // City overview pages (grid or single-city)
  const cityPages: MetadataRoute.Sitemap = KNOWN_CITY_SLUGS.map((slug) => ({
    url: `${appUrl}/city/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Curated neighborhood pages — these get their own indexed landing pages
  const neighborhoodPages: MetadataRoute.Sitemap = Object.values(
    CURATED_NEIGHBORHOODS
  ).flatMap((config) =>
    config.neighborhoods.map((n) => ({
      // Note: neighborhood pages need parentCity + bbox to load correctly.
      // The canonical URL here is the slug — Google will index the meta title/description
      // even if the page needs params to render fully.
      url: `${appUrl}/city/${n.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  );

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...cityPages,
    ...neighborhoodPages,
  ];
}
