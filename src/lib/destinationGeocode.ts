import { geocodeCity } from "@/lib/geocode";
import { getCanonicalDestinationMeta } from "@/data/activityDestinations";

const GEOCODE_QUERY_BY_SLUG: Record<string, string> = {
  // Surf disambiguation hints (LATAM + Caribbean)
  "cerro-azul-peru": "Cerro Azul, Canete, Peru",
  chicama: "Chicama, Ascope, La Libertad, Peru",
  champerico: "Champerico, Retalhuleu, Guatemala",
  "el-paredon": "El Paredon, Escuintla, Guatemala",
  jaco: "Jaco, Puntarenas, Costa Rica",
  "juanchaco": "Juanchaco, Buenaventura, Valle del Cauca, Colombia",
  "la-saladita": "La Saladita, Guerrero, Mexico",
  chapadmalal: "Chapadmalal, Buenos Aires, Argentina",
  quequen: "Quequen, Buenos Aires, Argentina",
  miramar: "Miramar, Buenos Aires, Argentina",
  necochea: "Necochea, Buenos Aires, Argentina",
  pinamar: "Pinamar, Buenos Aires, Argentina",
  "villa-gesell": "Villa Gesell, Buenos Aires, Argentina",
  "santa-clara-del-mar": "Santa Clara del Mar, Buenos Aires, Argentina",
  "mar-de-ajo": "Mar de Ajo, Buenos Aires, Argentina",
  "las-flores-el-salvador": "Playa Las Flores, San Miguel, El Salvador",
  "las-penitas": "Las Penitas, Leon, Nicaragua",
  lobitos: "Lobitos, Piura, Peru",
  "mal-pais": "Mal Pais, Puntarenas, Costa Rica",
  gigante: "Playa Gigante, Rivas, Nicaragua",
  monterrico: "Monterrico, Santa Rosa, Guatemala",
  "morro-negrito": "Morro Negrito, Veraguas, Panama",
  nuqui: "Nuqui, Choco, Colombia",
  pacasmayo: "Pacasmayo, La Libertad, Peru",
  palomino: "Palomino, La Guajira, Colombia",
  pavones: "Pavones, Golfito, Puntarenas, Costa Rica",
  "puerto-viejo": "Puerto Viejo de Talamanca, Limon, Costa Rica",
  "santa-catalina": "Santa Catalina, Sona, Veraguas, Panama",
  tamarindo: "Tamarindo, Guanacaste, Costa Rica",
  ubatuba: "Ubatuba, Litoral Norte, Sao Paulo, Brazil",
  maresias: "Maresias, Sao Sebastiao, Sao Paulo, Brazil",
  guaruja: "Guaruja, Sao Paulo, Brazil",
  garopaba: "Garopaba, Santa Catarina, Brazil",
  imbituba: "Imbituba, Santa Catarina, Brazil",
  "torres-rs": "Torres, Rio Grande do Sul, Brazil",
  bombinhas: "Bombinhas, Santa Catarina, Brazil",

  rincon: "Rincon, Puerto Rico",
  "san-juan-puerto-rico": "San Juan, Puerto Rico",
  aguadilla: "Aguadilla, Puerto Rico",
  "isabela-puerto-rico": "Isabela, Puerto Rico",
  martinique: "Martinique",
  guadeloupe: "Guadeloupe",
  barbados: "Barbados",
  "bathsheba-barbados": "Bathsheba, Barbados",
  aruba: "Aruba",
  "la-pedrera": "La Pedrera, Rocha, Uruguay",
  "jose-ignacio": "Jose Ignacio, Maldonado, Uruguay",
  piriapolis: "Piriapolis, Maldonado, Uruguay",
  "aguas-dulces": "Aguas Dulces, Rocha, Uruguay",
  "cabo-polonio": "Cabo Polonio, Rocha, Uruguay",
  "punta-colorada": "Punta Colorada, Maldonado, Uruguay",
  "punta-negra-uruguay": "Punta Negra, Maldonado, Uruguay",
};

export function slugToCityName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function geocodeDestinationSlug(slug: string) {
  const query = GEOCODE_QUERY_BY_SLUG[slug] ?? slugToCityName(slug);
  const city = await geocodeCity(query);
  if (!city) return null;

  // Keep user-facing names consistent even when geocoder returns admin parents.
  const DISPLAY_NAME_OVERRIDES: Record<string, { name: string; country?: string }> = {
    chicama: { name: "Chicama", country: "Peru" },
    juanchaco: { name: "Juanchaco", country: "Colombia" },
    pavones: { name: "Pavones", country: "Costa Rica" },
    "santa-catalina": { name: "Santa Catalina", country: "Panama" },
    ubatuba: { name: "Ubatuba", country: "Brazil" },
    maresias: { name: "Maresias", country: "Brazil" },
    guaruja: { name: "Guaruja", country: "Brazil" },
    garopaba: { name: "Garopaba", country: "Brazil" },
    imbituba: { name: "Imbituba", country: "Brazil" },
    "torres-rs": { name: "Torres", country: "Brazil" },
    bombinhas: { name: "Bombinhas", country: "Brazil" },
    "bathsheba-barbados": { name: "Bathsheba", country: "Barbados" },
  };

  const override = DISPLAY_NAME_OVERRIDES[slug];
  const displayAdjusted = override
    ? { ...city, name: override.name, country: override.country ?? city.country }
    : city;

  // Final canonical source for label/country to avoid geocoder drift.
  const canonical = getCanonicalDestinationMeta(slug);
  return canonical
    ? {
        ...displayAdjusted,
        name: canonical.name,
        country: canonical.country,
      }
    : displayAdjusted;
}

