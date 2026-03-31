import { geocodeCity } from "@/lib/geocode";

const GEOCODE_QUERY_BY_SLUG: Record<string, string> = {
  rincon: "Rincon, Puerto Rico",
  "san-juan-puerto-rico": "San Juan, Puerto Rico",
  aguadilla: "Aguadilla, Puerto Rico",
  "isabela-puerto-rico": "Isabela, Puerto Rico",
  martinique: "Martinique",
  guadeloupe: "Guadeloupe",
  barbados: "Barbados",
  "bathsheba-barbados": "Bathsheba, Barbados",
  aruba: "Aruba",
};

export function slugToCityName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function geocodeDestinationSlug(slug: string) {
  const query = GEOCODE_QUERY_BY_SLUG[slug] ?? slugToCityName(slug);
  return geocodeCity(query);
}

