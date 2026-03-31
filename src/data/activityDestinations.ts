import { KNOWN_CITY_SLUGS } from "./slugs";

export type ActivityBucket =
  | "surf"
  | "dive"
  | "hike"
  | "yoga"
  | "kite"
  | "work_first";

export interface ActivityDestination {
  slug: string;
  name: string;
}

export type CountryGroupedDestinations = Record<string, ActivityDestination[]>;

/**
 * Canonical destination catalog grouped by country.
 * This is used by refresh/backfill workflows so activity batches are explicit and auditable.
 */
export const ACTIVITY_DESTINATIONS_BY_COUNTRY: Record<
  ActivityBucket,
  CountryGroupedDestinations
> = {
  surf: {
    Mexico: [
      { slug: "puerto-escondido", name: "Puerto Escondido" },
      { slug: "sayulita", name: "Sayulita" },
      { slug: "san-pancho", name: "San Pancho" },
      { slug: "todos-santos", name: "Todos Santos" },
      { slug: "zipolite", name: "Zipolite" },
      { slug: "troncones", name: "Troncones" },
      { slug: "mazunte", name: "Mazunte" },
      { slug: "zihuatanejo", name: "Zihuatanejo" },
      { slug: "punta-mita", name: "Punta Mita" },
      { slug: "la-saladita", name: "La Saladita" },
    ],
    Guatemala: [
      { slug: "el-paredon", name: "El Paredon" },
      { slug: "monterrico", name: "Monterrico" },
      { slug: "champerico", name: "Champerico" },
    ],
    "El Salvador": [
      { slug: "el-tunco", name: "El Tunco" },
      { slug: "el-zonte", name: "El Zonte" },
      { slug: "las-flores-el-salvador", name: "Las Flores" },
      { slug: "mizata", name: "Mizata" },
      { slug: "punta-roca-la-libertad", name: "Punta Roca" },
    ],
    Nicaragua: [
      { slug: "san-juan-del-sur", name: "San Juan del Sur" },
      { slug: "popoyo", name: "Popoyo" },
      { slug: "gigante", name: "Playa Gigante" },
      { slug: "playa-colorado-nicaragua", name: "Playa Colorado" },
      { slug: "las-penitas", name: "Las Penitas" },
    ],
    "Costa Rica": [
      { slug: "nosara", name: "Nosara" },
      { slug: "santa-teresa", name: "Santa Teresa" },
      { slug: "tamarindo", name: "Tamarindo" },
      { slug: "dominical", name: "Dominical" },
      { slug: "jaco", name: "Jaco" },
      { slug: "pavones", name: "Pavones" },
      { slug: "puerto-viejo", name: "Puerto Viejo" },
      { slug: "playa-hermosa-jaco", name: "Playa Hermosa" },
      { slug: "mal-pais", name: "Mal Pais" },
    ],
    Panama: [
      { slug: "playa-venao", name: "Playa Venao" },
      { slug: "santa-catalina", name: "Santa Catalina" },
      { slug: "bocas-del-toro", name: "Bocas del Toro" },
      { slug: "morro-negrito", name: "Morro Negrito" },
    ],
    Colombia: [
      { slug: "palomino", name: "Palomino" },
      { slug: "nuqui", name: "Nuqui" },
      { slug: "juanchaco", name: "Juanchaco" },
    ],
    Ecuador: [
      { slug: "montanita", name: "Montanita" },
      { slug: "ayampe", name: "Ayampe" },
      { slug: "olon", name: "Olon" },
      { slug: "canoa", name: "Canoa" },
    ],
    Peru: [
      { slug: "mancora", name: "Mancora" },
      { slug: "lobitos", name: "Lobitos" },
      { slug: "huanchaco", name: "Huanchaco" },
      { slug: "chicama", name: "Chicama" },
      { slug: "punta-hermosa", name: "Punta Hermosa" },
      { slug: "cerro-azul-peru", name: "Cerro Azul" },
      { slug: "pacasmayo", name: "Pacasmayo" },
    ],
    Chile: [
      { slug: "pichilemu", name: "Pichilemu" },
      { slug: "arica", name: "Arica" },
      { slug: "iquique", name: "Iquique" },
    ],
    Brazil: [
      { slug: "florianopolis", name: "Florianopolis" },
      { slug: "itacare", name: "Itacare" },
      { slug: "pipa", name: "Pipa" },
      { slug: "praia-do-rosa", name: "Praia do Rosa" },
      { slug: "ubatuba", name: "Ubatuba" },
      { slug: "saquarema", name: "Saquarema" },
      { slug: "maresias", name: "Maresias" },
      { slug: "guaruja", name: "Guaruja" },
      { slug: "garopaba", name: "Garopaba" },
      { slug: "imbituba", name: "Imbituba" },
      { slug: "torres-rs", name: "Torres" },
      { slug: "bombinhas", name: "Bombinhas" },
    ],
    Argentina: [
      { slug: "mar-del-plata", name: "Mar del Plata" },
      { slug: "chapadmalal", name: "Chapadmalal" },
      { slug: "quequen", name: "Quequen" },
      { slug: "miramar", name: "Miramar" },
      { slug: "necochea", name: "Necochea" },
      { slug: "pinamar", name: "Pinamar" },
      { slug: "villa-gesell", name: "Villa Gesell" },
      { slug: "santa-clara-del-mar", name: "Santa Clara del Mar" },
      { slug: "mar-de-ajo", name: "Mar de Ajo" },
    ],
    Uruguay: [
      { slug: "la-paloma", name: "La Paloma" },
      { slug: "punta-del-diablo", name: "Punta del Diablo" },
      { slug: "punta-del-este", name: "Punta del Este" },
      { slug: "la-pedrera", name: "La Pedrera" },
      { slug: "jose-ignacio", name: "Jose Ignacio" },
      { slug: "piriapolis", name: "Piriapolis" },
      { slug: "aguas-dulces", name: "Aguas Dulces" },
      { slug: "cabo-polonio", name: "Cabo Polonio" },
      { slug: "punta-colorada", name: "Punta Colorada" },
      { slug: "punta-negra-uruguay", name: "Punta Negra" },
    ],
    "Dominican Republic": [
      { slug: "cabarete", name: "Cabarete" },
      { slug: "encuentro-cabarete", name: "Playa Encuentro" },
    ],
    "Puerto Rico": [
      { slug: "rincon", name: "Rincon" },
      { slug: "san-juan-puerto-rico", name: "San Juan" },
      { slug: "aguadilla", name: "Aguadilla" },
      { slug: "isabela-puerto-rico", name: "Isabela" },
    ],
    Martinique: [
      { slug: "martinique", name: "Martinique" },
    ],
    Guadeloupe: [
      { slug: "guadeloupe", name: "Guadeloupe" },
    ],
    Barbados: [
      { slug: "barbados", name: "Barbados" },
      { slug: "bathsheba-barbados", name: "Bathsheba" },
    ],
    Aruba: [
      { slug: "aruba", name: "Aruba" },
    ],
  },

  dive: {
    Panama: [{ slug: "bocas-del-toro", name: "Bocas del Toro" }],
    Honduras: [{ slug: "roatan", name: "Roatan" }],
    Belize: [
      { slug: "caye-caulker", name: "Caye Caulker" },
      { slug: "san-pedro-belize", name: "San Pedro" },
    ],
    Curacao: [{ slug: "curacao", name: "Curacao" }],
    Bonaire: [{ slug: "bonaire", name: "Bonaire" }],
    Brazil: [
      { slug: "bonito", name: "Bonito" },
      { slug: "fernando-de-noronha", name: "Fernando de Noronha" },
      { slug: "arraial-do-cabo", name: "Arraial do Cabo" },
    ],
    Ecuador: [{ slug: "galapagos", name: "Galapagos" }],
  },

  hike: {
    Argentina: [
      { slug: "bariloche", name: "Bariloche" },
      { slug: "el-chalten", name: "El Chalten" },
      { slug: "san-martin-de-los-andes", name: "San Martin de los Andes" },
      { slug: "tilcara", name: "Tilcara" },
      { slug: "cafayate", name: "Cafayate" },
      { slug: "el-bolson", name: "El Bolson" },
    ],
    Guatemala: [{ slug: "lago-atitlan", name: "Lago Atitlan" }],
  },

  yoga: {
    Mexico: [{ slug: "tulum", name: "Tulum" }],
  },

  kite: {
    "Dominican Republic": [
      { slug: "cabarete", name: "Cabarete" },
      { slug: "las-terrenas", name: "Las Terrenas" },
    ],
    Peru: [{ slug: "mancora", name: "Mancora" }],
    Brazil: [{ slug: "jericoacoara", name: "Jericoacoara" }],
  },

  work_first: {
    Mexico: [{ slug: "playa-del-carmen", name: "Playa del Carmen" }],
    Colombia: [
      { slug: "medellin-el-poblado", name: "Medellin El Poblado" },
      { slug: "cartagena", name: "Cartagena" },
    ],
    Argentina: [{ slug: "buenos-aires", name: "Buenos Aires" }],
  },
};

export interface CanonicalDestinationMeta {
  slug: string;
  name: string;
  country: string;
  activities: ActivityBucket[];
}

const CANONICAL_DESTINATION_BY_SLUG: Map<string, CanonicalDestinationMeta> = (() => {
  const map = new Map<string, CanonicalDestinationMeta>();
  const buckets = Object.entries(ACTIVITY_DESTINATIONS_BY_COUNTRY) as Array<
    [ActivityBucket, CountryGroupedDestinations]
  >;
  for (const [activity, grouped] of buckets) {
    for (const [country, destinations] of Object.entries(grouped)) {
      for (const destination of destinations) {
        const existing = map.get(destination.slug);
        if (!existing) {
          map.set(destination.slug, {
            slug: destination.slug,
            name: destination.name,
            country,
            activities: [activity],
          });
          continue;
        }
        if (!existing.activities.includes(activity)) {
          existing.activities.push(activity);
        }
      }
    }
  }
  return map;
})();

export function getCanonicalDestinationMeta(slug: string): CanonicalDestinationMeta | null {
  return CANONICAL_DESTINATION_BY_SLUG.get(slug) ?? null;
}

export function listCanonicalDestinationMetas(): CanonicalDestinationMeta[] {
  return Array.from(CANONICAL_DESTINATION_BY_SLUG.values());
}

function flattenCountries(map: CountryGroupedDestinations): string[] {
  return Object.values(map)
    .flat()
    .map((d) => d.slug);
}

export function getDestinationSlugsForActivity(
  activity: ActivityBucket | "exploring" | "all",
): string[] {
  if (activity === "all" || activity === "exploring") {
    return [...new Set(KNOWN_CITY_SLUGS)];
  }
  const slugs = flattenCountries(ACTIVITY_DESTINATIONS_BY_COUNTRY[activity]);
  return [...new Set(slugs)];
}

