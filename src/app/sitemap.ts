import type { MetadataRoute } from "next";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";
import { KNOWN_CITY_SLUGS, HIGH_PRIORITY_SLUGS } from "@/data/slugs";
import { CITY_INTROS } from "@/data/cityIntros";

const STATIC_INTRO_SLUGS = new Set(Object.keys(CITY_INTROS));
const CURATED_SLUGS = new Set(Object.keys(CURATED_NEIGHBORHOODS));

// Content last significantly updated — bump when adding new destinations or copy
const CONTENT_UPDATED = new Date("2026-03-27");

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://truststay.co";

  // ── Homepage ──────────────────────────────────────────────────────────────
  const home: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // ── City overview pages ───────────────────────────────────────────────────
  // Priority tiers:
  //   0.9 — major remote-work hubs (high search volume)
  //   0.8 — cities with curated neighborhood grids
  //   0.75 — cities with hand-written static intros
  //   0.65 — all other known destinations
  const uniqueSlugs = [...new Set(KNOWN_CITY_SLUGS)]; // deduplicate
  const cityPages: MetadataRoute.Sitemap = uniqueSlugs.map((slug) => {
    let priority = 0.65;
    if (HIGH_PRIORITY_SLUGS.has(slug)) priority = 0.9;
    else if (CURATED_SLUGS.has(slug)) priority = 0.8;
    else if (STATIC_INTRO_SLUGS.has(slug)) priority = 0.75;

    return {
      url: `${appUrl}/city/${slug}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly" as const,
      priority,
    };
  });

  // ── Curated neighborhood pages ────────────────────────────────────────────
  // Each neighborhood in a curated city gets its own indexed URL.
  const neighborhoodPages: MetadataRoute.Sitemap = Object.values(
    CURATED_NEIGHBORHOODS
  ).flatMap((config) =>
    config.neighborhoods.map((n) => ({
      url: `${appUrl}/city/${n.slug}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [...home, ...cityPages, ...neighborhoodPages];
}
