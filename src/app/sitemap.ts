import type { MetadataRoute } from "next";

const KNOWN_CITY_SLUGS = [
  "lisbon", "medellin", "bali", "mexico-city", "buenos-aires",
  "chiang-mai", "berlin", "barcelona", "amsterdam", "ho-chi-minh-city",
  "tbilisi", "budapest", "prague", "bansko", "playa-del-carmen",
  "oaxaca", "bogota", "san-jose", "taipei", "kuala-lumpur",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://trustay.app");

  const cityPages: MetadataRoute.Sitemap = KNOWN_CITY_SLUGS.map((slug) => ({
    url: `${appUrl}/city/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...cityPages,
  ];
}
