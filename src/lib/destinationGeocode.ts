import { geocodeCity } from "@/lib/geocode";

const GEOCODE_QUERY_BY_SLUG: Record<string, string> = {
  // Surf disambiguation hints (LATAM + Caribbean)
  "cerro-azul-peru": "Cerro Azul, Canete, Peru",
  champerico: "Champerico, Retalhuleu, Guatemala",
  "el-paredon": "El Paredon, Escuintla, Guatemala",
  jaco: "Jaco, Puntarenas, Costa Rica",
  "juanchaco": "Juanchaco, Buenaventura, Colombia",
  "la-saladita": "La Saladita, Guerrero, Mexico",
  "las-flores-el-salvador": "Playa Las Flores, San Miguel, El Salvador",
  "las-penitas": "Las Penitas, Leon, Nicaragua",
  lobitos: "Lobitos, Piura, Peru",
  "mal-pais": "Mal Pais, Puntarenas, Costa Rica",
  monterrico: "Monterrico, Santa Rosa, Guatemala",
  "morro-negrito": "Morro Negrito, Veraguas, Panama",
  nuqui: "Nuqui, Choco, Colombia",
  pacasmayo: "Pacasmayo, La Libertad, Peru",
  palomino: "Palomino, La Guajira, Colombia",
  pavones: "Pavones, Puntarenas, Costa Rica",
  "puerto-viejo": "Puerto Viejo de Talamanca, Limon, Costa Rica",
  "santa-catalina": "Santa Catalina, Veraguas, Panama",
  tamarindo: "Tamarindo, Guanacaste, Costa Rica",
  ubatuba: "Ubatuba, Sao Paulo, Brazil",

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

