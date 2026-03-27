import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { geocodeCity, reverseGeocodeArea, toSlug } from "@/lib/geocode";
import { sortByDistance, haversineKm } from "@/lib/overpass";
import { getPlacesWithCache } from "@/lib/placesCache";
import { computeCitySummary, computeBaseCentroid } from "@/lib/scoring";
import { enrichPlaces } from "@/lib/enrichment";
import type { Place } from "@/types";
import { isUnlocked } from "@/lib/unlock";
import { RoutineSummaryCard } from "@/components/RoutineSummaryCard";
import { RecommendedAreaCard } from "@/components/RecommendedAreaCard";
import { PlaceSection } from "@/components/PlaceSection";
import { PaywallCard } from "@/components/PaywallCard";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { CheckoutSuccessTracker } from "@/components/CheckoutSuccessTracker";
import { CityMap } from "@/components/CityMap";
import CityNeighborhoodGrid from "@/components/CityNeighborhoodGrid";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";
import type { CityNeighborhoodConfig } from "@/data/neighborhoods";
import { PLACE_OVERRIDES } from "@/data/placeOverrides";
import { getPlaceConfirmations } from "@/lib/confirmations";
import { CITY_INTROS } from "@/data/cityIntros";
import { CityIntro } from "@/components/CityIntro";
import { getNarrative } from "@/lib/kv";
import { discoverNeighborhoods } from "@/lib/neighborhoodDiscovery";
import { EmailCapture } from "@/components/EmailCapture";
import { ShareButton } from "@/components/ShareButton";
import type { City } from "@/types";

// Free tier limits — per merged section
const FREE_WORK = 1;          // 1 full card — rest shown as locked name teasers
const FREE_COFFEE_MEALS = 1;  // 1 full card — rest shown as locked name teasers
const FREE_WELLBEING = 1;

// ── Café routing ────────────────────────────────────────────────────────────
// Decides whether a café belongs in the "Work" section (work-oriented) or the
// "Coffee & meals" section (break / meal / coffee-stop oriented).
//
// Route to Work when work suitability is reasonably clear:
//   - workFit is high
//   - bestFor contains work-intent tags
//   - workFit is medium AND wifi is decent AND noise is not high
//
// Default (ambiguous / unclear signals) → Coffee & meals
function isCafeWorkSection(place: Place): boolean {
  const { confidence, bestFor } = place;

  // Explicit low-work signal — definitely Coffee & meals
  if (confidence.workFit === "low") return false;

  // Strong positive work signals — only high workFit or explicit deep_work tag
  if (confidence.workFit === "high") return true;
  // "deep_work" is only set for work-named cafes — not generic cafes
  if (bestFor.includes("deep_work")) return true;

  // Work-capable only when wifi is actually confirmed + noise is acceptable
  // wifiConfidence reaches "medium"/"verified" only via explicit OSM internet_access
  // tag or Google editorial summary mentioning wifi — not by default
  if (
    confidence.workFit === "medium" &&
    (confidence.wifiConfidence === "medium" ||
      confidence.wifiConfidence === "verified") &&
    confidence.noiseRisk !== "high"
  ) {
    return true;
  }

  // Everything else — no verified work signals → Coffee & meals
  return false;
}

/** Popular remote-work cities pre-rendered at build time for fast first load. */
const KNOWN_CITY_SLUGS = [
  // Major multi-neighborhood cities
  "lisbon", "medellin", "bali", "mexico-city", "buenos-aires",
  "chiang-mai", "berlin", "barcelona", "amsterdam", "ho-chi-minh-city",
  "tbilisi", "budapest", "prague", "bansko", "bogota",
  "taipei", "kuala-lumpur",

  // ── Mexico ───────────────────────────────────────────────────────────────
  // Pacific coast surf + yoga towns
  "playa-del-carmen", "oaxaca", "puerto-escondido", "sayulita",
  "tulum", "todos-santos", "mazunte", "troncones", "zihuatanejo",
  "huatulco", "la-paz",
  // Inland / cultural
  "san-cristobal-de-las-casas", "guanajuato", "merida",

  // ── Belize ───────────────────────────────────────────────────────────────
  // Diving + island remote work
  "caye-caulker", "san-pedro-belize", "placencia",

  // ── Guatemala ────────────────────────────────────────────────────────────
  // Volcano hiking, yoga, Lake Atitlán villages
  "antigua-guatemala", "lago-atitlan",
  "san-marcos-la-laguna", "san-pedro-la-laguna", "panajachel",
  "quetzaltenango",

  // ── Honduras ─────────────────────────────────────────────────────────────
  // Bay Islands diving, ruins
  "roatan", "utila", "copan-ruinas",

  // ── El Salvador ──────────────────────────────────────────────────────────
  "el-tunco", "el-zonte",

  // ── Guatemala (additions) ─────────────────────────────────────────────────
  "el-paredon", "acatenango",

  // ── Nicaragua ────────────────────────────────────────────────────────────
  "san-juan-del-sur", "popoyo", "gigante", "leon", "granada",
  "ometepe",

  // ── Costa Rica ───────────────────────────────────────────────────────────
  // Pacific surf + wellness + volcano towns
  "santa-teresa", "nosara", "tamarindo", "dominical", "montezuma",
  "jaco", "puerto-viejo", "pavones", "monteverde", "arenal",

  // ── Panama ───────────────────────────────────────────────────────────────
  "bocas-del-toro", "boquete", "santa-catalina", "pedasi",
  "el-valle-de-anton", "coiba",

  // ── Colombia ─────────────────────────────────────────────────────────────
  // Cities + activity destinations
  "minca", "palomino", "santa-marta", "cartagena",
  "villa-de-leyva", "salento", "taganga", "san-andres", "cabo-de-la-vela",
  // Pacific coast dive
  "nuqui",

  // ── Ecuador ──────────────────────────────────────────────────────────────
  // Coast surf + Andes + Amazon + wellness
  "montanita", "olon", "banos", "canoa", "cuenca",
  "quilotoa", "vilcabamba", "mindo",
  // Galápagos dive
  "galapagos",

  // ── Peru ─────────────────────────────────────────────────────────────────
  // Surf village + trekking + Sacred Valley bases
  "mancora", "huanchaco", "huaraz", "cusco",
  "lobitos", "chicama", "ollantaytambo", "pisac",

  // ── Bolivia ──────────────────────────────────────────────────────────────
  "sucre", "coroico",

  // ── Chile ────────────────────────────────────────────────────────────────
  "pucon", "san-pedro-de-atacama", "pichilemu", "puerto-natales", "iquique",
  // Chile — hike additions
  "cajon-del-maipo", "cochamo", "futaleufu", "conguillo",
  // Easter Island dive
  "hanga-roa",

  // ── Argentina ────────────────────────────────────────────────────────────
  "bariloche", "mendoza", "salta", "el-chalten", "jujuy",
  // Patagonia coast dive
  "puerto-madryn", "ushuaia",
  // NW Argentina — Quebrada & pre-Puna
  "tilcara", "purmamarca", "humahuaca", "iruya", "cafayate",
  // Mendoza Andes
  "uspallata", "potrerillos",
  // Patagonia Argentina additions
  "el-bolson", "san-martin-de-los-andes", "villa-la-angostura", "esquel",

  // ── Brazil ───────────────────────────────────────────────────────────────
  // Surf + yoga + eco villages + kite
  "florianopolis", "itacare", "jericoacoara",
  "pipa", "paraty", "arraial-do-cabo",
  // Brazil dive additions
  "fernando-de-noronha", "abrolhos",
  "cumbuco", "sao-miguel-do-gostoso", "lencois", "bonito",

  // ── Dominican Republic ───────────────────────────────────────────────────
  // Kite + surf + nomad community
  "cabarete", "las-terrenas",

  // ── Mexico (additions) ───────────────────────────────────────────────────
  "cozumel", "isla-mujeres", "bacalar",

  // ── South America hubs ───────────────────────────────────────────────────
  "lima", "quito", "panama-city", "montevideo",
  "santiago", "valparaiso", "sao-paulo", "rio-de-janeiro", "fortaleza",

  // ── Venezuela ────────────────────────────────────────────────────────────
  "los-roques",

  // ── Caribbean ─────────────────────────────────────────────────────────────
  // ABC islands
  "bonaire", "curacao", "aruba",
  // French Antilles
  "martinique", "guadeloupe",
  // Lesser Antilles
  "dominica", "barbados",

  // ── New surf destinations ─────────────────────────────────────────────────
  "playa-venao", "ayampe", "praia-do-rosa", "punta-del-diablo",
  "rincon",

  // ── New dive destinations ─────────────────────────────────────────────────
  "mahahual", "cahuita", "providencia", "bayahibe",

  // ── New hike destinations ─────────────────────────────────────────────────
  "tayrona", "chachapoyas", "sorata", "rurrenabaque", "alto-paraiso",

  // ── New yoga / wellness destinations ─────────────────────────────────────
  "tepoztlan", "uvita", "trancoso",

  // ── New kite & wind destinations ─────────────────────────────────────────
  "prea", "atins", "canoa-quebrada", "la-ventana", "los-barriles",
  "paracas", "la-paloma",

  // ── New remote work hubs ──────────────────────────────────────────────────
  "guadalajara", "puerto-vallarta",
  "san-jose-costa-rica", "san-juan-puerto-rico",
  "arequipa", "la-paz-bolivia",
  "curitiba", "porto-alegre", "recife", "salvador",
  "cordoba", "rosario", "asuncion",
  "cali", "punta-del-este",
];

export async function generateStaticParams() {
  // City-level slugs
  const citySlugs = KNOWN_CITY_SLUGS.map((slug) => ({ slug }));

  // Curated neighborhood slugs — pre-render each neighborhood for SEO
  const neighborhoodSlugs = Object.values(CURATED_NEIGHBORHOODS).flatMap(
    (config) => config.neighborhoods.map((n) => ({ slug: n.slug }))
  );

  return [...citySlugs, ...neighborhoodSlugs];
}

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

/** Format a URL slug into a human-readable city name for metadata fallback. */
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://truststay.co";
  const canonicalUrl = `${appUrl}/city/${slug}`;

  const hasParentCity =
    typeof sp.parentCity === "string" && sp.parentCity.trim().length > 0;

  // ── Neighborhood grid pages (curated cities like Buenos Aires, Mexico City)
  const curated = CURATED_NEIGHBORHOODS[slug];
  if (curated && !hasParentCity) {
    const title = `Best neighborhoods in ${curated.cityName} for remote workers`;
    const description = `Choose where to base yourself in ${curated.cityName}. Compare neighborhoods by work spots, cafés, and routine options — built for remote workers on the move.`;
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: { title, description, url: canonicalUrl, type: "website" },
    };
  }

  // ── Neighbourhood or regular city page
  const rawName =
    typeof sp.name === "string" && sp.name.trim() ? sp.name.trim() : null;
  const cityName = rawName ?? slugToName(slug);
  const parentCity =
    typeof sp.parentCity === "string" && sp.parentCity.trim()
      ? sp.parentCity.trim()
      : null;

  // Neighbourhood: "Work, coffee & routine in Palermo, Buenos Aires"
  // City: "Work, coffee & routine in Lisbon"
  const displayName = parentCity ? `${cityName}, ${parentCity}` : cityName;
  const title = `Work, coffee & routine in ${displayName}`;
  const introSummary = CITY_INTROS[slug]?.summary ?? null;
  const description = introSummary
    ? introSummary
    : parentCity
    ? `Find the best work spots, cafés, and training options in ${cityName} — a neighborhood in ${parentCity} — organized for remote workers.`
    : `Find where to base yourself in ${cityName}, with places to work, grab coffee or meals, and keep your training routine — organized for remote workers on the move.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl, type: "website" },
  };
}

function getString(sp: SearchParams, key: string): string | undefined {
  const val = sp[key];
  return typeof val === "string" ? val : undefined;
}

async function resolveCity(
  slug: string,
  sp: SearchParams
): Promise<City | null> {
  const lat = parseFloat(getString(sp, "lat") ?? "");
  const lon = parseFloat(getString(sp, "lon") ?? "");
  const name = getString(sp, "name");
  const country = getString(sp, "country") ?? "";
  const parentCity = getString(sp, "parentCity");
  const bboxParam = getString(sp, "bbox");

  if (!isNaN(lat) && !isNaN(lon) && name) {
    let bbox: [number, number, number, number] | undefined;
    if (bboxParam) {
      const parts = bboxParam.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        bbox = parts as [number, number, number, number];
      }
    }
    return { name, slug, country, lat, lon, bbox, parentCity };
  }

  // Geocode hints for slugs that are ambiguous or need country context to
  // avoid Nominatim picking a high-importance place in the wrong country
  // (e.g. "minca" → München without a hint).
  const GEOCODE_HINTS: Record<string, string> = {
    // ── Existing hints ──────────────────────────────────────────────────────
    "minca":                   "Minca Magdalena Colombia",
    "banos":                   "Baños Tungurahua Ecuador",
    "el-zonte":                "El Zonte La Libertad El Salvador",
    "el-tunco":                "El Tunco La Libertad El Salvador",
    "olon":                    "Olón Santa Elena Ecuador",
    "mancora":                 "Máncora Piura Peru",
    "itacare":                 "Itacaré Bahia Brazil",
    "jericoacoara":            "Jericoacoara Ceará Brazil",
    "puerto-viejo":            "Puerto Viejo de Talamanca Limón Costa Rica",
    "boquete":                 "Boquete Chiriquí Panama",
    "antigua-guatemala":       "Antigua Guatemala Sacatepéquez",
    "popoyo":                  "Popoyo Rivas Nicaragua",
    "nosara":                  "Nosara Guanacaste Costa Rica",
    "montanita":               "Montañita Santa Elena Ecuador",
    "sayulita":                "Sayulita Nayarit Mexico",
    "santa-teresa":            "Santa Teresa Puntarenas Costa Rica",
    "bocas-del-toro":          "Bocas del Toro Panama",
    "tamarindo":               "Tamarindo Guanacaste Costa Rica",
    "san-juan-del-sur":        "San Juan del Sur Rivas Nicaragua",
    "puerto-escondido":        "Puerto Escondido Oaxaca Mexico",
    "florianopolis":           "Florianópolis Santa Catarina Brazil",

    // ── Mexico ──────────────────────────────────────────────────────────────
    "tulum":                   "Tulum Quintana Roo Mexico",
    "todos-santos":            "Todos Santos Baja California Sur Mexico",
    "mazunte":                 "Mazunte Oaxaca Mexico",
    "troncones":               "Troncones Guerrero Mexico",
    "zihuatanejo":             "Zihuatanejo Guerrero Mexico",
    "huatulco":                "Huatulco Oaxaca Mexico",
    "la-paz":                  "La Paz Baja California Sur Mexico",
    "san-cristobal-de-las-casas": "San Cristóbal de las Casas Chiapas Mexico",
    "guanajuato":              "Guanajuato Guanajuato Mexico",
    "merida":                  "Mérida Yucatan Mexico",

    // ── Belize ──────────────────────────────────────────────────────────────
    "caye-caulker":            "Caye Caulker Belize District Belize",
    "san-pedro-belize":        "San Pedro Belize",
    "placencia":               "Placencia Stann Creek Belize",

    // ── Guatemala ───────────────────────────────────────────────────────────
    "lago-atitlan":            "Lago de Atitlán Sololá Guatemala",
    "san-marcos-la-laguna":    "San Marcos La Laguna Sololá Guatemala",
    "san-pedro-la-laguna":     "San Pedro La Laguna Sololá Guatemala",
    "panajachel":              "Panajachel Sololá Guatemala",
    "quetzaltenango":          "Quetzaltenango Guatemala",

    // ── Honduras ────────────────────────────────────────────────────────────
    "roatan":                  "Roatán Bay Islands Honduras",
    "utila":                   "Utila Bay Islands Honduras",
    "copan-ruinas":            "Copán Ruinas Copán Honduras",

    // ── Nicaragua ───────────────────────────────────────────────────────────
    "gigante":                 "Gigante Rivas Nicaragua",
    "leon":                    "León Nicaragua",
    "granada":                 "Granada Nicaragua",

    // ── Costa Rica ──────────────────────────────────────────────────────────
    "dominical":               "Dominical Puntarenas Costa Rica",
    "montezuma":               "Montezuma Puntarenas Costa Rica",
    "jaco":                    "Jacó Puntarenas Costa Rica",

    // ── Panama ──────────────────────────────────────────────────────────────
    "santa-catalina":          "Santa Catalina Veraguas Panama",
    "pedasi":                  "Pedasí Los Santos Panama",

    // ── Colombia ────────────────────────────────────────────────────────────
    "palomino":                "Palomino La Guajira Colombia",
    "santa-marta":             "Santa Marta Magdalena Colombia",
    "cartagena":               "Cartagena de Indias Bolívar Colombia",
    "villa-de-leyva":          "Villa de Leyva Boyacá Colombia",
    "salento":                 "Salento Quindío Colombia",

    // ── Ecuador ─────────────────────────────────────────────────────────────
    "canoa":                   "Canoa Manabí Ecuador",
    "cuenca":                  "Cuenca Azuay Ecuador",

    // ── Peru ────────────────────────────────────────────────────────────────
    "huanchaco":               "Huanchaco La Libertad Peru",
    "huaraz":                  "Huaraz Ancash Peru",
    "cusco":                   "Cusco Cusco Peru",

    // ── Bolivia ─────────────────────────────────────────────────────────────
    "sucre":                   "Sucre Bolivia",
    "coroico":                 "Coroico La Paz Bolivia",

    // ── Chile ───────────────────────────────────────────────────────────────
    "pucon":                   "Pucón La Araucanía Chile",
    "san-pedro-de-atacama":    "San Pedro de Atacama Antofagasta Chile",

    // ── Argentina ───────────────────────────────────────────────────────────
    "bariloche":               "Bariloche Río Negro Argentina",
    "mendoza":                 "Mendoza Argentina",
    "salta":                   "Salta Argentina",
    "el-chalten":              "El Chaltén Santa Cruz Argentina",

    // ── Brazil ──────────────────────────────────────────────────────────────
    "pipa":                    "Pipa Rio Grande do Norte Brazil",
    "paraty":                  "Paraty Rio de Janeiro Brazil",
    "arraial-do-cabo":         "Arraial do Cabo Rio de Janeiro Brazil",

    // ── Dominican Republic ──────────────────────────────────────────────────
    "cabarete":                "Cabarete Puerto Plata Dominican Republic",
    "las-terrenas":            "Las Terrenas Samaná Dominican Republic",

    // ── Guatemala (additions) ────────────────────────────────────────────────
    "el-paredon":              "El Paredon Escuintla Guatemala",
    "acatenango":              "Acatenango Chimaltenango Guatemala",

    // ── Nicaragua (additions) ────────────────────────────────────────────────
    "ometepe":                 "Isla de Ometepe Rivas Nicaragua",

    // ── Costa Rica (additions) ───────────────────────────────────────────────
    "pavones":                 "Pavones Puntarenas Costa Rica",
    "monteverde":              "Monteverde Puntarenas Costa Rica",
    "arenal":                  "La Fortuna Alajuela Costa Rica",

    // ── Panama (additions) ───────────────────────────────────────────────────
    "el-valle-de-anton":       "El Valle de Antón Coclé Panama",
    "coiba":                   "Coiba Veraguas Panama",

    // ── Colombia (additions) ─────────────────────────────────────────────────
    "taganga":                 "Taganga Magdalena Colombia",
    "san-andres":              "San Andrés Archipiélago de San Andrés Colombia",
    "cabo-de-la-vela":         "Cabo de la Vela La Guajira Colombia",
    "nuqui":                   "Nuquí Chocó Colombia",

    // ── Ecuador (additions) ──────────────────────────────────────────────────
    "quilotoa":                "Quilotoa Cotopaxi Ecuador",
    "vilcabamba":              "Vilcabamba Loja Ecuador",
    "mindo":                   "Mindo Pichincha Ecuador",
    "galapagos":               "Puerto Ayora Santa Cruz Galápagos Ecuador",

    // ── Peru (additions) ─────────────────────────────────────────────────────
    "lobitos":                 "Lobitos Piura Peru",
    "chicama":                 "Chicama La Libertad Peru",
    "ollantaytambo":           "Ollantaytambo Cusco Peru",
    "pisac":                   "Pisac Cusco Peru",

    // ── Chile (additions) ────────────────────────────────────────────────────
    "pichilemu":               "Pichilemu O'Higgins Chile",
    "puerto-natales":          "Puerto Natales Magallanes Chile",
    "iquique":                 "Iquique Tarapacá Chile",

    // ── Chile — Patagonia & highlands hike spots ──────────────────────────────
    "cajon-del-maipo":         "San José de Maipo Región Metropolitana Chile",
    "cochamo":                 "Cochamó Los Lagos Chile",
    "futaleufu":               "Futaleufú Los Lagos Chile",
    "conguillo":               "Melipeuco Araucanía Chile",
    // ── Chile — Easter Island dive ────────────────────────────────────────────
    "hanga-roa":               "Hanga Roa Isla de Pascua Valparaíso Chile",

    // ── Argentina (additions) ────────────────────────────────────────────────
    "jujuy":                   "San Salvador de Jujuy Jujuy Argentina",
    "puerto-madryn":           "Puerto Madryn Chubut Argentina",
    "ushuaia":                 "Ushuaia Tierra del Fuego Argentina",

    // ── Argentina — NW highlands (Quebrada de Humahuaca & pre-Puna) ──────────
    "tilcara":                 "Tilcara Jujuy Argentina",
    "purmamarca":              "Purmamarca Jujuy Argentina",
    "humahuaca":               "Humahuaca Jujuy Argentina",
    "iruya":                   "Iruya Salta Argentina",
    "cafayate":                "Cafayate Salta Argentina",

    // ── Argentina — Mendoza Andes ─────────────────────────────────────────────
    "uspallata":               "Uspallata Mendoza Argentina",
    "potrerillos":             "Potrerillos Mendoza Argentina",

    // ── Argentina — Patagonia additions ──────────────────────────────────────
    "el-bolson":               "El Bolsón Río Negro Argentina",
    "san-martin-de-los-andes": "San Martín de los Andes Neuquén Argentina",
    "villa-la-angostura":      "Villa La Angostura Neuquén Argentina",
    "esquel":                  "Esquel Chubut Argentina",

    // ── Brazil (additions) ───────────────────────────────────────────────────
    "fernando-de-noronha":     "Vila dos Remédios Fernando de Noronha Pernambuco Brazil",
    "abrolhos":                "Caravelas Bahia Brazil",
    "cumbuco":                 "Cumbuco Ceará Brazil",
    "sao-miguel-do-gostoso":   "São Miguel do Gostoso Rio Grande do Norte Brazil",
    "lencois":                 "Lençóis Bahia Brazil",
    "bonito":                  "Bonito Mato Grosso do Sul Brazil",

    // ── Mexico (additions) ───────────────────────────────────────────────────
    "cozumel":                 "Cozumel Quintana Roo Mexico",
    "isla-mujeres":            "Isla Mujeres Quintana Roo Mexico",
    "bacalar":                 "Bacalar Quintana Roo Mexico",

    // ── South America hubs ───────────────────────────────────────────────────
    "lima":                    "Lima Lima Peru",
    "quito":                   "Quito Pichincha Ecuador",
    "panama-city":             "Panama City Panama",
    "montevideo":              "Montevideo Uruguay",
    "santiago":                "Santiago Chile",
    "valparaiso":              "Valparaíso Valparaíso Chile",
    "sao-paulo":               "São Paulo São Paulo Brazil",
    "rio-de-janeiro":          "Rio de Janeiro Rio de Janeiro Brazil",
    "fortaleza":               "Fortaleza Ceará Brazil",

    // ── Caribbean ────────────────────────────────────────────────────────────
    // Use simple island/capital names — Nominatim doesn't handle long compound
    // phrases like "Kingdom of the Netherlands Caribbean" and returns nothing.
    "bonaire":                 "Kralendijk Bonaire",
    "curacao":                 "Willemstad Curaçao",
    "aruba":                   "Oranjestad Aruba",
    "martinique":              "Fort-de-France Martinique",
    "guadeloupe":              "Pointe-à-Pitre Guadeloupe",
    "dominica":                "Roseau Dominica",
    "barbados":                "Bridgetown Barbados",

    // ── New surf ─────────────────────────────────────────────────────────────
    "playa-venao":             "Playa Venao Los Santos Panama",
    "ayampe":                  "Ayampe Manabí Ecuador",
    "praia-do-rosa":           "Praia do Rosa Imbituba Santa Catarina Brazil",
    "punta-del-diablo":        "Punta del Diablo Rocha Uruguay",
    "rincon":                  "Rincón Añasco Puerto Rico",

    // ── New dive ─────────────────────────────────────────────────────────────
    "mahahual":                "Mahahual Quintana Roo Mexico",
    "cahuita":                 "Cahuita Limón Costa Rica",
    "providencia":             "Providencia Archipiélago de San Andrés Providencia Colombia",
    "bayahibe":                "Bayahíbe La Romana Dominican Republic",

    // ── New hike ─────────────────────────────────────────────────────────────
    "tayrona":                 "El Zaino Magdalena Colombia",
    "chachapoyas":             "Chachapoyas Amazonas Peru",
    "sorata":                  "Sorata La Paz Bolivia",
    "rurrenabaque":            "Rurrenabaque Beni Bolivia",
    "alto-paraiso":            "Alto Paraíso de Goiás Goiás Brazil",

    // ── New yoga / wellness ───────────────────────────────────────────────────
    "tepoztlan":               "Tepoztlán Morelos Mexico",
    "uvita":                   "Uvita Puntarenas Costa Rica",
    "trancoso":                "Trancoso Porto Seguro Bahia Brazil",

    // ── New kite & wind ───────────────────────────────────────────────────────
    "prea":                    "Preá Cruz Ceará Brazil",
    "atins":                   "Atins Maranhão Brazil",
    "canoa-quebrada":          "Canoa Quebrada Aracati Ceará Brazil",
    "la-ventana":              "La Ventana Baja California Sur Mexico",
    "los-barriles":            "Los Barriles Baja California Sur Mexico",
    "paracas":                 "Paracas Ica Peru",
    "la-paloma":               "La Paloma Rocha Uruguay",

    // ── New remote work hubs ──────────────────────────────────────────────────
    "guadalajara":             "Guadalajara Jalisco Mexico",
    "puerto-vallarta":         "Puerto Vallarta Jalisco Mexico",
    "san-jose-costa-rica":     "San José Costa Rica",
    "san-juan-puerto-rico":    "San Juan Puerto Rico",
    "arequipa":                "Arequipa Arequipa Peru",
    "la-paz-bolivia":          "La Paz Bolivia",
    "curitiba":                "Curitiba Paraná Brazil",
    "porto-alegre":            "Porto Alegre Rio Grande do Sul Brazil",
    "recife":                  "Recife Pernambuco Brazil",
    "salvador":                "Salvador Bahia Brazil",
    "cordoba":                 "Córdoba Córdoba Argentina",
    "rosario":                 "Rosario Santa Fe Argentina",
    "asuncion":                "Asunción Paraguay",
    "cali":                    "Cali Valle del Cauca Colombia",
    "punta-del-este":          "Punta del Este Maldonado Uruguay",

    // ── Venezuela ─────────────────────────────────────────────────────────────
    "los-roques":              "Los Roques Dependencias Federales Venezuela",
  };

  const query = GEOCODE_HINTS[slug] ?? slug.replace(/-/g, " ");
  const city = await geocodeCity(query);
  // Preserve the canonical URL slug regardless of what Nominatim derives
  return city ? { ...city, slug } : null;
}

export default async function CityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const hasParentCityParam =
    typeof sp.parentCity === "string" && sp.parentCity.trim().length > 0;

  const justUnlocked = sp.justUnlocked === "1";

  // ── Curated city grid (instant — no geocoding needed) ───────────────────
  // If the slug is in CURATED_NEIGHBORHOODS and we're not already inside a
  // specific neighbourhood, show the grid immediately.
  const curated = CURATED_NEIGHBORHOODS[slug];
  if (curated && !hasParentCityParam) {
    const bundlePrice = process.env.NEXT_PUBLIC_CITY_BUNDLE_PRICE ?? "15";
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <CityNeighborhoodGrid config={curated} bundlePrice={bundlePrice} />
        </main>
        <Footer />
      </div>
    );
  }

  const parentCitySlug = (() => {
    // Prefer URL param (set by autocomplete/grid), fall back to geocoded parentCity
    const raw = sp.parentCity;
    const name = typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
    return name ? toSlug(name) : undefined;
    // Note: city.parentCity is used after city resolves for the PaywallCard
  })();

  const [city, unlocked, kvNarrativePage] = await Promise.all([
    resolveCity(slug, sp),
    isUnlocked(slug, parentCitySlug),
    getNarrative(slug).catch(() => null),
  ]);

  if (!city) {
    const cityLabel = slug.replace(/-/g, " ");
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-20">
          <div className="max-w-xl space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
                Not found
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bark">
                City not found
              </h1>
              <p className="mt-4 text-base leading-7 text-umber">
                We could not find a city matching{" "}
                <span className="font-medium text-bark">
                  &ldquo;{cityLabel}&rdquo;
                </span>
                . Try searching again with a different spelling.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-block rounded-xl bg-bark px-5 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                  Search again
                </Link>
                <Link
                  href={`/city-requests?city=${encodeURIComponent(slug)}`}
                  className="inline-block rounded-xl border border-dune bg-white px-5 py-3 text-sm font-medium text-umber transition-colors hover:bg-cream"
                >
                  Vote to add it →
                </Link>
              </div>
            </div>
            <EmailCapture
              context="city_not_found"
              citySlug={slug}
              cityName={cityLabel}
              prompt={`Want us to notify you when we add "${cityLabel}"?`}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Fires as soon as the city page shell renders (before Suspense resolves) */}
      <AnalyticsEvent
        event="city_page_viewed"
        properties={{
          city_slug: city.slug,
          city_name: city.name,
          country: city.country,
          is_unlocked: unlocked,
        }}
      />

      {/* Fires once after a successful checkout, via sessionStorage handoff from PaywallCard */}
      <CheckoutSuccessTracker
        citySlug={city.slug}
        cityName={city.name}
        country={city.country}
        isUnlocked={unlocked}
      />

      <main className="flex-1">
        {/* Treat as a neighbourhood if: URL has parentCity param, OR geocoding
            itself resolved this as a neighbourhood (city.parentCity is set).
            This handles direct searches like "Las Cañitas" correctly. */}
        {(hasParentCityParam || !!city.parentCity) ? (
          // ── Neighbourhood page: show hero + place content ──────────────
          <div className="mx-auto w-full max-w-4xl px-6 py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
                Area setup
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h1 className="text-4xl font-semibold tracking-tight text-bark sm:text-5xl">
                  {city.name}
                </h1>
                <ShareButton
                  cityName={city.parentCity ?? city.name}
                  citySlug={city.slug}
                  neighborhoodName={city.name}
                />
              </div>
              <p className="mt-1.5 text-base text-umber">
                {(city.parentCity ?? (typeof sp.parentCity === "string" ? sp.parentCity.trim() : null))
                  ? `${city.parentCity ?? sp.parentCity}${city.country ? `, ${city.country}` : ""}`
                  : city.country}
              </p>
              {(() => {
                const kvIntro = kvNarrativePage?.intro ?? null;
                const staticIntro = CITY_INTROS[city.slug] ?? null;
                if (kvIntro) return (
                  <div className="mt-5 max-w-xl">
                    <CityIntro intro={{ summary: kvIntro, activity: kvNarrativePage?.activity ?? undefined, bestMonths: kvNarrativePage?.bestMonths ?? undefined }} />
                  </div>
                );
                if (staticIntro) return (
                  <div className="mt-5 max-w-xl">
                    <CityIntro intro={staticIntro} />
                  </div>
                );
                return (
                  <p className="mt-3 max-w-xl text-sm leading-6 text-umber">
                    Find a base area, places to work, nearby coffee and meals, and
                    wellbeing spots — so you can settle into {city.name} without
                    losing your routine.
                  </p>
                );
              })()}
            </div>
            <Suspense fallback={<PlacesSkeleton />}>
              <CityContent city={city} isUnlocked={unlocked} justUnlocked={justUnlocked} kvNarrative={kvNarrativePage} />
            </Suspense>
          </div>
        ) : (
          // ── Top-level city: try auto-discovery, fallback to place content ─
          <Suspense fallback={<DiscoverySkeleton cityName={city.name} />}>
            <AutoNeighborhoodOrContent city={city} isUnlocked={unlocked} justUnlocked={justUnlocked} kvNarrative={kvNarrativePage} />
          </Suspense>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Auto-discovery wrapper ────────────────────────────────────────────────────
// For top-level city pages (no parentCity): try to discover neighborhoods first.
// If >= 3 are found → show the neighborhood grid.
// If not enough data → fall through to the normal single-city place content.
//
// Performance: discoverNeighborhoods + fetchPlaces run in PARALLEL.
// For cities without neighborhoods this cuts the critical path from ~4-5s to ~2s
// because CityContent gets a cache-warm hit on fetchPlaces (instant).
async function AutoNeighborhoodOrContent({
  city,
  isUnlocked,
  justUnlocked,
  kvNarrative,
}: {
  city: City;
  isUnlocked: boolean;
  justUnlocked: boolean;
  kvNarrative: import("@/lib/kv").StoredNarrative | null;
}) {
  // Run both in parallel — getPlacesWithCache warms the KV/fetch cache so
  // CityContent gets an instant hit instead of waiting a second time.
  const [neighborhoods] = await Promise.all([
    discoverNeighborhoods(city),
    getPlacesWithCache(city).catch(() => []),
  ]);

  if (neighborhoods.length >= 3) {
    const config: CityNeighborhoodConfig = {
      cityName: city.name,
      citySlug: city.slug,
      neighborhoods,
    };
    // No bundlePrice for auto-discovered cities — bundle is only for curated ones
    return <CityNeighborhoodGrid config={config} bundlePrice={undefined} />;
  }

  // Not enough neighborhood data — fire analytics and show normal city page
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <AnalyticsEvent
        event="city_no_neighborhoods_found"
        properties={{
          city_slug: city.slug,
          city_name: city.name,
          country: city.country,
          neighborhoods_found: neighborhoods.length,
        }}
      />
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
          City setup
        </p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-bark sm:text-5xl">
            {city.name}
          </h1>
          <ShareButton
            cityName={city.name}
            citySlug={city.slug}
            neighborhoodName={city.name}
          />
        </div>
        <p className="mt-1.5 text-base text-umber">{city.country}</p>
        {(() => {
          const kvIntro = kvNarrative?.intro ?? null;
          const staticIntro = CITY_INTROS[city.slug] ?? null;
          if (kvIntro) return (
            <div className="mt-5 max-w-xl">
              <CityIntro intro={{ summary: kvIntro, activity: kvNarrative?.activity ?? undefined, bestMonths: kvNarrative?.bestMonths ?? undefined }} />
            </div>
          );
          if (staticIntro) return (
            <div className="mt-5 max-w-xl">
              <CityIntro intro={staticIntro} />
            </div>
          );
          return (
            <p className="mt-3 max-w-xl text-sm leading-6 text-umber">
              Find a base area, places to work, nearby coffee and meals, and
              training spots — so you can settle into {city.name} without losing
              your routine.
            </p>
          );
        })()}
      </div>
      {/* getPlacesWithCache already called above — KV/fetch cache warm, CityContent resolves instantly */}
      <Suspense fallback={<PlacesSkeleton />}>
        <CityContent city={city} isUnlocked={isUnlocked} justUnlocked={justUnlocked} kvNarrative={kvNarrative} />
      </Suspense>
    </div>
  );
}

function DiscoverySkeleton({ cityName }: { cityName: string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-28 rounded bg-stone-200 mb-3" />
        <div className="h-8 w-64 rounded bg-stone-200 mb-2" />
        <div className="h-4 w-80 rounded bg-stone-200" />
        <p className="sr-only">Loading neighborhoods for {cityName}…</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}

// Async server component — runs place fetch + scoring, streams into the page.
// getPlacesWithCache checks KV first (instant), falls back to Overpass.
async function CityContent({
  city,
  isUnlocked,
  justUnlocked = false,
  kvNarrative = null,
}: {
  city: City;
  isUnlocked: boolean;
  justUnlocked?: boolean;
  kvNarrative?: import("@/lib/kv").StoredNarrative | null;
}) {
  let allPlaces;
  try {
    allPlaces = await getPlacesWithCache(city);
  } catch (err) {
    const errorType =
      err instanceof Error ? err.message : "upstream_fetch_failed";
    return (
      <div className="mt-10 space-y-4">
        {/* fire city_data_failed for the graceful-failure path */}
        <AnalyticsEvent
          event="city_data_failed"
          properties={{
            city_slug: city.slug,
            city_name: city.name,
            country: city.country,
            error_type: errorType,
            source: "graceful_fallback",
          }}
        />
        <div className="rounded-2xl border border-dune bg-white px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
            Data temporarily unavailable
          </p>
          <p className="mt-2 text-sm leading-6 text-umber">
            We could not fetch place data for {city.name} right now. This is
            usually a temporary issue with the upstream data service. Try
            refreshing in a moment.
          </p>
        </div>
      </div>
    );
  }

  // ── Google Places enrichment ─────────────────────────────────────────────
  // Only run for unlocked users — saves ~800ms (4 Google API calls) for the
  // majority of visitors who are on the free tier.
  // Non-unlocked users still see OSM confidence signals on their 3 free cards.
  // When a user unlocks, the page re-renders with full enrichment.
  const enrichedPlaces = isUnlocked
    ? await enrichPlaces(allPlaces, city.lat, city.lon)
    : allPlaces;

  // ── Base area centroid ───────────────────────────────────────────────────
  // Weighted average of cafe + coworking coordinates — more actionable than
  // the raw geocoded city centre for "how far is this from where I'd stay?".
  const baseCentroid = computeBaseCentroid(enrichedPlaces, city.lat, city.lon);

  // Add distanceFromBasekm to every place (used in card + modal display)
  const places: Place[] = baseCentroid
    ? enrichedPlaces.map((p) => ({
        ...p,
        distanceFromBasekm:
          Math.round(
            haversineKm(baseCentroid.lat, baseCentroid.lon, p.lat, p.lon) * 10
          ) / 10,
      }))
    : enrichedPlaces;

  // Reverse geocode the work-cluster centroid to get a real neighbourhood name.
  // Only attempt if we have a centroid (≥3 work places) AND user is unlocked
  // (non-unlocked users don't see the RecommendedAreaCard detail that uses this).
  const areaName =
    isUnlocked && baseCentroid
      ? await reverseGeocodeArea(baseCentroid.lat, baseCentroid.lon)
      : null;

  const algorithmicSummary = computeCitySummary(city, places, areaName ?? undefined);

  // Merge KV narrative on top of algorithmic summary (KV wins for text fields)
  const summary = {
    ...algorithmicSummary,
    ...(kvNarrative && {
      summaryText: kvNarrative.summaryText,
      recommendedArea: kvNarrative.baseAreaName,
      areaReason: kvNarrative.baseAreaReason,
    }),
  };

  // ── Confirmation signals (Task 18) ───────────────────────────────────────
  const confirmations = isUnlocked
    ? await getPlaceConfirmations(city.slug).catch(() => new Map())
    : new Map<string, import("@/lib/confirmations").PlaceConfirmData>();

  // kvNarrative is passed in from the page level (already fetched in parallel)

  // ── Data coverage level ──────────────────────────────────────────────────
  const dataCoverage: "good" | "partial" | "limited" | "none" =
    places.length >= 15
      ? "good"
      : places.length >= 6
      ? "partial"
      : places.length >= 1
      ? "limited"
      : "none";

  // ── Section grouping + quality sorting ──────────────────────────────────
  // Each section is sorted by how well a place fulfills the section's purpose:
  //
  // Work:          coworkings first, then cafes; within each tier sort by
  //                workFit signal → Google rating → distance from base
  // Coffee & meals: sort by Google rating → routineSupport → distance
  // Training:      sort by distance from base (closest gym wins)

  function workScore(p: Place): number {
    // Coworkings always beat cafes
    const categoryBonus = p.category === "coworking" ? 100 : 0;
    // workFit signal
    const workFitBonus =
      p.confidence.workFit === "high" ? 30 :
      p.confidence.workFit === "medium" ? 15 : 0;
    // wifi signal
    const wifiBonus =
      p.confidence.wifiConfidence === "verified" ? 10 :
      p.confidence.wifiConfidence === "medium" ? 5 : 0;
    // Google rating (0–5 scaled to 0–20)
    const ratingBonus = (p.google?.rating ?? p.rating ?? 0) * 4;
    // Distance penalty (closer = better, max 10 point swing)
    const distPenalty = Math.min((p.distanceFromBasekm ?? p.distanceKm ?? 5) * 2, 10);
    return categoryBonus + workFitBonus + wifiBonus + ratingBonus - distPenalty;
  }

  function coffeeMealsScore(p: Place): number {
    // Google rating (0–5 scaled to 0–25)
    const ratingBonus = (p.google?.rating ?? p.rating ?? 0) * 5;
    // routineSupport signal
    const routineBonus =
      p.confidence.routineSupport === "high" ? 15 :
      p.confidence.routineSupport === "medium" ? 7 : 0;
    // Distance penalty
    const distPenalty = Math.min((p.distanceFromBasekm ?? p.distanceKm ?? 5) * 2, 10);
    return ratingBonus + routineBonus - distPenalty;
  }

  // Community-approved overrides for this city/neighborhood
  const relevantOverrides = PLACE_OVERRIDES.filter(
    (o) => o.citySlug === city.slug || o.neighborhoodSlug === "*" && o.citySlug === city.slug
  );
  function overrideToPlace(o: (typeof PLACE_OVERRIDES)[number]): Place {
    return {
      id: `community_${o.citySlug}_${o.name.replace(/\s+/g, "_").toLowerCase()}`,
      name: o.name,
      category: o.category === "work" ? "coworking" : o.category === "food" ? "food" : "gym",
      lat: o.lat,
      lon: o.lon,
      confidence: {},
      bestFor: o.bestFor ?? [],
      explanation: o.note,
      source: "community",
    };
  }
  const overrideWork = relevantOverrides.filter((o) => o.category === "work").map(overrideToPlace);
  const overrideFood = relevantOverrides.filter((o) => o.category === "food").map(overrideToPlace);
  const overrideWellbeing = relevantOverrides.filter((o) => o.category === "wellbeing").map(overrideToPlace);

  const workPlaces = [
    ...overrideWork,
    ...places.filter((p) => p.category === "coworking"),
    ...places.filter((p) => p.category === "cafe" && isCafeWorkSection(p)),
  ].sort((a, b) => workScore(b) - workScore(a)).slice(0, 20);

  const coffeeMealsPlaces = [
    ...overrideFood,
    ...places.filter((p) => p.category === "food"),
    ...places.filter((p) => p.category === "cafe" && !isCafeWorkSection(p)),
  ].sort((a, b) => coffeeMealsScore(b) - coffeeMealsScore(a)).slice(0, 20);

  const wellbeingPlaces = sortByDistance(
    [...overrideWellbeing, ...places.filter((p) => p.category === "gym")]
  ).slice(0, 10);

  const lockedCounts = {
    work: Math.max(workPlaces.length - FREE_WORK, 0),
    coffeeMeals: Math.max(coffeeMealsPlaces.length - FREE_COFFEE_MEALS, 0),
    training: Math.max(wellbeingPlaces.length - FREE_WELLBEING, 0),
  };
  const hasLockedContent = Object.values(lockedCounts).some((n) => n > 0);

  // Generate a qualitative hook line based on what is hidden behind the paywall.
  const lockedWorkPlaces = workPlaces.slice(FREE_WORK);
  const lockedCoffeeMealsPlaces = coffeeMealsPlaces.slice(FREE_COFFEE_MEALS);
  const lockedWellbeingPlaces = wellbeingPlaces.slice(FREE_WELLBEING);

  let hookLine: string | undefined;
  const hasLockedCoworking = lockedWorkPlaces.some(
    (p) => p.category === "coworking"
  );
  const hasLockedEnrichedMeals = lockedCoffeeMealsPlaces.some(
    (p) => p.google?.rating !== undefined
  );
  const allCategoriesLocked =
    lockedCounts.work > 0 &&
    lockedCounts.coffeeMeals > 0 &&
    lockedCounts.training > 0;

  if (hasLockedContent) {
    if (allCategoriesLocked) {
      hookLine = "Full setup — work spots, meals, and wellbeing options.";
    } else if (hasLockedCoworking) {
      hookLine = "Includes dedicated coworking spaces with verified hours.";
    } else if (hasLockedEnrichedMeals) {
      hookLine = "Places with ratings, hours, and menu links available.";
    } else if (lockedCounts.work > 0) {
      hookLine = "More work-friendly cafés and spots near your base.";
    } else if (lockedWellbeingPlaces.length > 0) {
      hookLine = "More wellbeing options to help you keep your routine.";
    }
  }

  return (
    <div className="mt-10 space-y-8">
      {/* Fires when place data resolves successfully (after Suspense) */}
      <AnalyticsEvent
        event="city_data_loaded"
        properties={{
          city_slug: city.slug,
          city_name: city.name,
          country: city.country,
          total_places: places.length,
          routine_score: summary.routineScore,
          is_unlocked: isUnlocked,
        }}
      />

      {/* Data coverage notice — only shown for partial/limited data */}
      {dataCoverage !== "good" && dataCoverage !== "none" && (
        <CoverageNotice city={city.name} level={dataCoverage} />
      )}

      {/* Routine map — first thing the user sees; locked places as grey dots */}
      {(baseCentroid || places.length > 0) && (
        <CityMap
          places={[...workPlaces, ...coffeeMealsPlaces, ...wellbeingPlaces]}
          baseLat={baseCentroid?.lat}
          baseLon={baseCentroid?.lon}
          isUnlocked={isUnlocked}
          freePlaceIds={[
            workPlaces[0]?.id,
            coffeeMealsPlaces[0]?.id,
            wellbeingPlaces[0]?.id,
          ].filter((id): id is string => Boolean(id))}
          cityName={city.name}
          totalPlaces={workPlaces.length + coffeeMealsPlaces.length + wellbeingPlaces.length}
        />
      )}

      {/* Summary cards — score + base area */}
      <div className="grid gap-4 sm:grid-cols-2">
        <RoutineSummaryCard summary={summary} />
        <RecommendedAreaCard
          summary={summary}
          centroidLat={baseCentroid?.lat}
          centroidLon={baseCentroid?.lon}
        />
      </div>

      <PlaceSection
        title="Work"
        subtitle="Coworkings and work-friendly cafés near your base"
        places={workPlaces}
        freeCount={FREE_WORK}
        isUnlocked={isUnlocked}
        citySlug={city.slug}
        neighborhoodSlug={city.slug}
        sectionKind="work"
        confirmations={confirmations}
        emptyMessage="No strong work spots found near this base yet."
      />

      <PlaceSection
        title="Coffee & meals"
        subtitle="Places to grab coffee, breakfast, or lunch without breaking your day"
        places={coffeeMealsPlaces}
        freeCount={FREE_COFFEE_MEALS}
        isUnlocked={isUnlocked}
        citySlug={city.slug}
        neighborhoodSlug={city.slug}
        sectionKind="food"
        confirmations={confirmations}
        emptyMessage="No clear coffee or meal spots found near this base yet."
      />

      <PlaceSection
        title="Wellbeing"
        subtitle="Gyms, yoga, and places to keep your body in check"
        places={wellbeingPlaces}
        freeCount={FREE_WELLBEING}
        isUnlocked={isUnlocked}
        citySlug={city.slug}
        neighborhoodSlug={city.slug}
        sectionKind="wellbeing"
        confirmations={confirmations}
        emptyMessage="No wellbeing spots found near this base yet."
      />

      {/* Paywall — shown only when locked and there is locked content */}
      {!isUnlocked && hasLockedContent && (
        <PaywallCard
          citySlug={city.slug}
          cityName={city.name}
          country={city.country}
          lockedCounts={lockedCounts}
          hookLine={hookLine}
          parentCity={city.parentCity}
          parentCitySlug={city.parentCity ? toSlug(city.parentCity) : undefined}
          bundlePrice={
            // Only show the bundle CTA when the parent is a curated city
            // (i.e. a real city with multiple neighborhoods to unlock).
            // Avoids nonsensical CTAs like "Unlock all San Pedro La Laguna — $15"
            // for lakes/natural features whose OSM parent is a tiny village.
            city.parentCity && CURATED_NEIGHBORHOODS[toSlug(city.parentCity)]
              ? (process.env.NEXT_PUBLIC_CITY_BUNDLE_PRICE ?? "15")
              : undefined
          }
        />
      )}

      {/* Post-payment email capture — shown once, right after unlock */}
      {justUnlocked && isUnlocked && (
        <EmailCapture
          context="post_payment"
          citySlug={city.slug}
          cityName={city.name}
          prompt={`Want a heads up if we update ${city.name}?`}
        />
      )}

      <MethodologyNote />
    </div>
  );
}

function PlacesSkeleton() {
  return (
    <div className="mt-10 space-y-8 animate-pulse">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-stone-200" />
        <div className="h-28 rounded-2xl bg-stone-200" />
      </div>

      {/* Place sections */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-28 rounded bg-stone-200" />
          <div className="h-20 rounded-2xl bg-stone-200" />
          <div className="h-20 rounded-2xl bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

function CoverageNotice({
  city,
  level,
}: {
  city: string;
  level: "partial" | "limited";
}) {
  return (
    <div className="rounded-2xl border border-dune bg-white px-6 py-4">
      <p className="text-sm leading-6 text-umber">
        {level === "limited" ? (
          <>
            <span className="font-medium text-bark">Limited data found for {city}.</span>{" "}
            Results are incomplete — this city may be less covered in OpenStreetMap.
          </>
        ) : (
          <>
            Data coverage for {city} is moderate. Some options may be missing — OpenStreetMap data varies by city.
          </>
        )}
      </p>
    </div>
  );
}

function MethodologyNote() {
  return (
    <div className="rounded-2xl border border-dune bg-white px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
        About this data
      </p>
      <p className="mt-2 text-sm leading-6 text-umber">
        Place data is sourced from OpenStreetMap via Overpass API. Confidence
        signals are derived from venue category, proximity, and available tags —
        not from direct verification. Wi-Fi, noise, and work comfort ratings
        marked as &ldquo;unknown&rdquo; or &ldquo;not verified&rdquo; have not been tested.
        Results may be incomplete in less-mapped cities.
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-dune bg-cream">
      <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-umber hover:text-bark transition-colors"
        >
          ← Back
        </Link>
        <div className="h-4 w-px bg-dune" />
        <span className="text-base font-semibold tracking-tight text-bark">
          Truststay
        </span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-dune bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-umber">
          Truststay — built for remote workers who need to get functional fast.
        </p>
      </div>
    </footer>
  );
}
