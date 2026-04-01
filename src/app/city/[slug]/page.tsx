import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { geocodeCity, reverseGeocodeArea, toSlug } from "@/lib/geocode";
import { sortByDistance, haversineKm } from "@/lib/overpass";
import { getPlacesWithCache, saveEnrichedPlaces, getDailyLifeWithCache } from "@/lib/placesCache";
import { computeCitySummary, computeBaseCentroid, computeStayFitScore, appendDailyLifeSignals } from "@/lib/scoring";
import { enrichPlaces } from "@/lib/enrichment";
import type { Place } from "@/types";
import { isUnlocked } from "@/lib/unlock";
import { RoutineSummaryCard } from "@/components/RoutineSummaryCard";
import { RecommendedAreaCard } from "@/components/RecommendedAreaCard";
import { PlaceSection } from "@/components/PlaceSection";
import { PaywallCard } from "@/components/PaywallCard";
import { AnalyticsEvent } from "@/components/AnalyticsEvent";
import { CheckoutSuccessTracker } from "@/components/CheckoutSuccessTracker";
import { CityReturnVisitTracker } from "@/components/CityReturnVisitTracker";
import { RestoreUnlocksCard } from "@/components/RestoreUnlocksCard";
import { CityMap } from "@/components/CityMap";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";
import { PLACE_OVERRIDES } from "@/data/placeOverrides";
import { getPlaceConfirmations } from "@/lib/confirmations";
import { CITY_INTROS } from "@/data/cityIntros";
import { CityIntro } from "@/components/CityIntro";
import {
  getNarrative,
  getUserStaySetup,
  saveUserStaySetup,
  TRUSTSTAY_USER_COOKIE,
} from "@/lib/kv";
import { EmailCapture } from "@/components/EmailCapture";
import { ShareButton } from "@/components/ShareButton";
import { BestBaseCard } from "@/components/BestBaseCard";
import { IntentPrompt } from "@/components/IntentPrompt";
import { getOrGenerateStayFitNarrative } from "@/lib/narrativeAI";
import type { StayFitNarrative } from "@/lib/narrativeAI";
import { getOrGenerateEnrichedNarrative } from "@/lib/placeEnrichmentAgent";
import type { MicroAreaNarrative } from "@/lib/placeEnrichmentAgent";
import { MicroAreaStack } from "@/components/MicroAreaStack";
import type { City, StayIntent, StayPurpose, WorkStyle, VibePreference, DailyBalance } from "@/types";

// ── Stay intent parsing ───────────────────────────────────────────────────────
// Intent is resolved from URL params and threaded through as a typed prop.
// The UI "Shape this stay" module (milestone 2) will write these params.

const VALID_PURPOSES: StayPurpose[] = [
  "surf", "dive", "hike", "yoga", "kite", "work_first", "exploring",
];
const VALID_WORK_STYLES: WorkStyle[] = ["light", "balanced", "heavy"];
const VALID_VIBES: VibePreference[] = ["social", "local", "quiet"];
const VALID_DAILY_BALANCES: DailyBalance[] = ["purpose_first", "balanced", "work_first"];

function parseIntent(sp: SearchParams): StayIntent | null {
  const purpose = typeof sp.purpose === "string" ? sp.purpose : undefined;
  const workStyle = typeof sp.workStyle === "string" ? sp.workStyle : undefined;
  if (!purpose || !VALID_PURPOSES.includes(purpose as StayPurpose)) return null;
  if (!workStyle || !VALID_WORK_STYLES.includes(workStyle as WorkStyle)) return null;
  const vibeRaw = typeof sp.vibe === "string" ? sp.vibe : undefined;
  const vibe =
    vibeRaw && VALID_VIBES.includes(vibeRaw as VibePreference)
      ? (vibeRaw as VibePreference)
      : undefined;
  const dailyBalanceRaw = typeof sp.dailyBalance === "string" ? sp.dailyBalance : undefined;
  const dailyBalance =
    dailyBalanceRaw && VALID_DAILY_BALANCES.includes(dailyBalanceRaw as DailyBalance)
      ? (dailyBalanceRaw as DailyBalance)
      : undefined;
  return { purpose: purpose as StayPurpose, workStyle: workStyle as WorkStyle, dailyBalance, vibe };
}

/**
 * Extract just the purpose from the URL (even if full intent is absent).
 * Used to pre-fill Q1 in IntentPrompt when the user arrived from Browse.
 */
function parsePrefillPurpose(sp: SearchParams): StayPurpose | null {
  const raw = typeof sp.purpose === "string" ? sp.purpose : undefined;
  if (!raw || !VALID_PURPOSES.includes(raw as StayPurpose)) return null;
  return raw as StayPurpose;
}

function parseSavedSetupIntent(input: {
  purpose: string;
  workStyle: string;
  dailyBalance?: string;
} | null): StayIntent | null {
  if (!input) return null;
  const purpose = VALID_PURPOSES.includes(input.purpose as StayPurpose)
    ? (input.purpose as StayPurpose)
    : null;
  const workStyle = VALID_WORK_STYLES.includes(input.workStyle as WorkStyle)
    ? (input.workStyle as WorkStyle)
    : null;
  if (!purpose || !workStyle) return null;
  const dailyBalance = input.dailyBalance &&
    VALID_DAILY_BALANCES.includes(input.dailyBalance as DailyBalance)
      ? (input.dailyBalance as DailyBalance)
      : undefined;
  return { purpose, workStyle, dailyBalance };
}

// Free tier limits — per merged section
const FREE_WORK = 1;          // 1 full card — rest shown as locked name teasers
const FREE_COFFEE_MEALS = 1;  // 1 full card — rest shown as locked name teasers
const FREE_WELLBEING = 1;
const FREE_ESSENTIALS = 1;

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

import { KNOWN_CITY_SLUGS } from "@/data/slugs";

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
  const ogImage = `${appUrl}/city/${slug}/opengraph-image`;
  const canonicalUrl = `${appUrl}/city/${slug}`;

  const hasParentCity =
    typeof sp.parentCity === "string" && sp.parentCity.trim().length > 0;

  // ── Neighborhood grid pages (curated cities like Buenos Aires, Mexico City)
  const curated = CURATED_NEIGHBORHOODS[slug];
  if (curated && !hasParentCity) {
    const title = `Where to base yourself in ${curated.cityName} — work setup & daily life`;
    const description = `Find the right base in ${curated.cityName} for your kind of stay. Work spots, daily-life essentials, and what to plan around — prepared for remote workers.`;
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: { title, description, url: canonicalUrl, type: "website", images: [ogImage] },
      twitter: { card: "summary_large_image", title, description, images: [ogImage] },
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

  const intro = CITY_INTROS[slug];

  // Title strategy:
  // Neighborhood: "Basing in Palermo, Buenos Aires — work setup & daily life"
  // City with activity (surf/dive/hike): "Puerto Escondido — surf + remote work base, setup & preparation"
  // City generic: "Where to base yourself in Lisbon — work, daily life & stay preparation"
  let title: string;
  let description: string;

  if (parentCity) {
    title = `Basing in ${cityName}, ${parentCity} — work setup & daily life`;
    description = `Work spots, cafés, daily essentials, and what to plan around in ${cityName} — a neighborhood in ${parentCity}. Prepared for remote workers staying a week or more.`;
  } else if (intro?.activity && intro.activity !== "work") {
    const activityLabel: Record<string, string> = {
      surf: "surf + remote work",
      dive: "diving + remote work",
      hike: "hiking + remote work",
      yoga: "yoga + remote work",
      kite: "kite + remote work",
    };
    const act = activityLabel[intro.activity] ?? "remote work";
    title = `${cityName} — ${act} base, setup & preparation`;
    description = intro.summary
      ?? `Know your base in ${cityName} before you arrive. Work infrastructure, daily life, and what to plan around — for remote workers who already know where they're going.`;
  } else {
    title = `Where to base yourself in ${cityName} — work, daily life & stay preparation`;
    description = intro?.summary
      ?? `Find your base in ${cityName} as a remote worker. Work spots, daily essentials, and honest signals on what to prepare — so you're functional from day one.`;
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl, type: "website", images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
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

  // Curated-city bypass — derive city center from known neighborhood coordinates.
  // This completely avoids Nominatim for cities we have curated data for, preventing
  // disambiguation errors (e.g. "medellin" → Medellín Philippines instead of Colombia).
  const curated = CURATED_NEIGHBORHOODS[slug];
  if (curated && curated.neighborhoods.length > 0) {
    const lats = curated.neighborhoods.map((n) => n.lat);
    const lons = curated.neighborhoods.map((n) => n.lon);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLon = lons.reduce((a, b) => a + b, 0) / lons.length;
    const curatedCountry: Record<string, string> = {
      "buenos-aires": "Argentina", "mexico-city": "Mexico",
      "bangkok": "Thailand",      "london": "United Kingdom",
      "lisbon": "Portugal",       "medellin": "Colombia",
      "chiang-mai": "Thailand",   "bali": "Indonesia",
      "barcelona": "Spain",       "berlin": "Germany",
      "lago-atitlan": "Guatemala","roatan": "Honduras",
    };
    return {
      name:    curated.cityName,
      slug,
      country: curatedCountry[slug] ?? "",
      lat:     centerLat,
      lon:     centerLon,
    };
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
    "chapadmalal":             "Chapadmalal Buenos Aires Argentina",
    "quequen":                 "Quequén Buenos Aires Argentina",
    "miramar":                 "Miramar Buenos Aires Argentina",
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
    "maresias":                "Maresias São Sebastião São Paulo Brazil",
    "guaruja":                 "Guarujá São Paulo Brazil",
    "garopaba":                "Garopaba Santa Catarina Brazil",
    "imbituba":                "Imbituba Santa Catarina Brazil",
    "torres-rs":               "Torres Rio Grande do Sul Brazil",
    "bombinhas":               "Bombinhas Santa Catarina Brazil",

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
    "necochea":                "Necochea Buenos Aires Argentina",
    "pinamar":                 "Pinamar Buenos Aires Argentina",
    "villa-gesell":            "Villa Gesell Buenos Aires Argentina",
    "santa-clara-del-mar":     "Santa Clara del Mar Buenos Aires Argentina",
    "mar-de-ajo":              "Mar de Ajó Buenos Aires Argentina",

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
    // (curated cities like medellin, buenos-aires are handled by the bypass above)
    "bogota":                  "Bogotá Cundinamarca Colombia",
    "lima":                    "Lima Lima Peru",
    "quito":                   "Quito Pichincha Ecuador",
    "panama-city":             "Panama City Panama",
    "montevideo":              "Montevideo Uruguay",
    "santiago":                "Santiago Chile",
    "valparaiso":              "Valparaíso Valparaíso Chile",
    "sao-paulo":               "São Paulo São Paulo Brazil",
    "rio-de-janeiro":          "Rio de Janeiro Rio de Janeiro Brazil",
    "fortaleza":               "Fortaleza Ceará Brazil",

    // ── Mexico hubs ──────────────────────────────────────────────────────────
    "oaxaca":                  "Oaxaca de Juárez Oaxaca Mexico",

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
    "la-pedrera":              "La Pedrera Rocha Uruguay",
    "jose-ignacio":            "José Ignacio Maldonado Uruguay",
    "piriapolis":              "Piriápolis Maldonado Uruguay",
    "aguas-dulces":            "Aguas Dulces Rocha Uruguay",
    "cabo-polonio":            "Cabo Polonio Rocha Uruguay",
    "punta-colorada":          "Punta Colorada Maldonado Uruguay",
    "punta-negra-uruguay":     "Punta Negra Maldonado Uruguay",

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

  // Display name overrides — when Nominatim returns an administrative parent
  // (e.g. "Cóbano" for santa-teresa, "Tulum Municipality" for tulum), force
  // the user-facing name to the well-known destination name.
  const DISPLAY_NAME_OVERRIDES: Record<string, { name: string; country: string }> = {
    "santa-teresa":   { name: "Santa Teresa",   country: "Costa Rica"  },
    "mal-pais":       { name: "Mal País",        country: "Costa Rica"  },
    "popoyo":         { name: "Popoyo",          country: "Nicaragua"   },
    "el-zonte":       { name: "El Zonte",        country: "El Salvador" },
    "el-tunco":       { name: "El Tunco",        country: "El Salvador" },
    "olon":           { name: "Olón",            country: "Ecuador"     },
    "mancora":        { name: "Máncora",         country: "Peru"        },
    "jericoacoara":   { name: "Jericoacoara",    country: "Brazil"      },
    "puerto-viejo":   { name: "Puerto Viejo",    country: "Costa Rica"  },
  };

  const query = GEOCODE_HINTS[slug] ?? slug.replace(/-/g, " ");
  const city = await geocodeCity(query);
  if (!city) return null;

  const override = DISPLAY_NAME_OVERRIDES[slug];
  return {
    ...city,
    slug,
    name: override?.name ?? city.name,
    country: override?.country ?? city.country,
  };
}


export default async function CityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const cookieStore = await cookies();
  const userId = cookieStore.get(TRUSTSTAY_USER_COOKIE)?.value ?? null;

  const hasParentCityParam =
    typeof sp.parentCity === "string" && sp.parentCity.trim().length > 0;

  const justUnlocked = sp.justUnlocked === "1";
  const urlIntent = parseIntent(sp);
  const hasAnyIntentParam =
    typeof sp.purpose === "string" ||
    typeof sp.workStyle === "string" ||
    typeof sp.dailyBalance === "string";
  const shouldUseSavedSetup = !urlIntent && !hasAnyIntentParam && Boolean(userId);
  const savedSetup = shouldUseSavedSetup && userId
    ? await getUserStaySetup(userId, slug).catch(() => null)
    : null;
  const intent: StayIntent | null = urlIntent ?? parseSavedSetupIntent(savedSetup);

  if (urlIntent && userId) {
    saveUserStaySetup({
      userId,
      citySlug: slug,
      purpose: urlIntent.purpose,
      workStyle: urlIntent.workStyle,
      dailyBalance: urlIntent.dailyBalance,
    }).catch((err) => {
      console.warn("[intent] failed to save user setup:", err);
    });
  }
  // Extracted even when intent is null — lets IntentPrompt pre-select purpose
  // when the user arrived from Browse (purpose in URL but workStyle missing).
  const prefillPurpose = intent ? null : parsePrefillPurpose(sp);

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
                This destination is not available yet
              </h1>
              <p className="mt-4 text-base leading-7 text-umber">
                We could not find a city matching{" "}
                <span className="font-medium text-bark">
                  &ldquo;{cityLabel}&rdquo;
                </span>
                . Leave your email and we will notify you as soon as this destination is available.
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://truststay.co";
  const intro = CITY_INTROS[slug];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: intro
      ? `${city.name} for remote workers — ${intro.activity ?? "work"}, wifi & routine`
      : `${city.name} for remote workers`,
    description:
      intro?.summary ??
      `Work spots, wifi cafés, gyms, and routine options in ${city.name} — curated for digital nomads and remote workers.`,
    url: `${appUrl}/city/${slug}`,
    isPartOf: { "@type": "WebSite", name: "Truststay", url: appUrl },
    about: {
      "@type": "Place",
      name: city.name,
      address: { "@type": "PostalAddress", addressCountry: city.country },
    },
    keywords: [
      `${city.name} remote work`,
      `${city.name} digital nomad`,
      `${city.name} coworking`,
      `${city.name} wifi cafes`,
      `where to stay ${city.name}`,
      `best area ${city.name} remote worker`,
    ].join(", "),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
        hasIntent={Boolean(intent)}
      />
      <CityReturnVisitTracker
        citySlug={city.slug}
        cityName={city.name}
        isUnlocked={unlocked}
        hasIntent={Boolean(intent)}
      />

      {/* Validation signal for checkout continuity: user returned unlocked but intent params are missing. */}
      {justUnlocked && unlocked && !intent && (
        <AnalyticsEvent
          event="checkout_intent_missing_after_return"
          properties={{
            city_slug: city.slug,
            city_name: city.name,
            country: city.country,
          }}
        />
      )}

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
            <CityContent
              city={city}
              isUnlocked={unlocked}
              justUnlocked={justUnlocked}
              kvNarrative={kvNarrativePage}
              intent={intent}
              prefillPurpose={prefillPurpose}
            />
          </div>
        ) : (
          // ── Top-level city: always use direct city/micro-area flow ─────
          <div className="mx-auto w-full max-w-4xl px-6 py-16">
            <CityPageHeader city={city} kvNarrative={kvNarrativePage} />
            <CityContent
              city={city}
              isUnlocked={unlocked}
              justUnlocked={justUnlocked}
              kvNarrative={kvNarrativePage}
              intent={intent}
              prefillPurpose={prefillPurpose}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ── Shared city-level page header ────────────────────────────────────────────
// Used by the curated+intent path and the auto-discovery intent path.
// Renders city name, country, and intro text (KV or static or default).
function CityPageHeader({
  city,
  kvNarrative,
}: {
  city: City;
  kvNarrative: import("@/lib/kv").StoredNarrative | null;
}) {
  const kvIntro = kvNarrative?.intro ?? null;
  const staticIntro = CITY_INTROS[city.slug] ?? null;

  return (
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
      {kvIntro ? (
        <div className="mt-5 max-w-xl">
          <CityIntro
            intro={{
              summary: kvIntro,
              activity: kvNarrative?.activity ?? undefined,
              bestMonths: kvNarrative?.bestMonths ?? undefined,
            }}
          />
        </div>
      ) : staticIntro ? (
        <div className="mt-5 max-w-xl">
          <CityIntro intro={staticIntro} />
        </div>
      ) : (
        <p className="mt-3 max-w-xl text-sm leading-6 text-umber">
          Find a base area, places to work, nearby coffee and meals, and
          training spots — so you can settle into {city.name} without losing
          your routine.
        </p>
      )}
    </div>
  );
}

// Async server component — runs place fetch + scoring before page render.
// getPlacesWithCache checks KV first (instant), falls back to Overpass.
async function CityContent({
  city,
  isUnlocked,
  justUnlocked = false,
  kvNarrative = null,
  intent = null,
  prefillPurpose = null,
}: {
  city: City;
  isUnlocked: boolean;
  justUnlocked?: boolean;
  kvNarrative?: import("@/lib/kv").StoredNarrative | null;
  intent?: StayIntent | null;
  /** Purpose from URL when intent is partial (only purpose, no workStyle). Used to pre-fill IntentPrompt. */
  prefillPurpose?: StayPurpose | null;
}) {
  let allPlaces: Place[];
  let placesCachedAt: string | undefined;
  let needsEnrichment = true;
  try {
    const result = await getPlacesWithCache(city);
    allPlaces = result.places;
    placesCachedAt = result.cachedAt;
    needsEnrichment = result.needsEnrichment;
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
  // Only run for unlocked users AND when the KV cache needs refreshing.
  // Once enriched data is in KV (enrichedAt set, < 7 days old), all users
  // benefit from the cached Google data — zero extra API calls.
  const enrichedPlaces =
    isUnlocked && needsEnrichment
      ? await enrichPlaces(allPlaces, city.lat, city.lon)
      : allPlaces;

  // Persist enriched places back to KV so future visits skip Google API
  if (isUnlocked && needsEnrichment) {
    saveEnrichedPlaces(city, enrichedPlaces, placesCachedAt);
  }

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

  // Run remaining async work in parallel: reverse geocode + daily-life fetch + confirmations.
  // Note: reverseGeocodeArea runs for ALL users (not just unlocked) because the BestBaseCard
  // shows the area name in the free/locked state too. Nominatim is free and fast.
  const [areaName, dailyLifePlaces, confirmations] = await Promise.all([
    baseCentroid
      ? reverseGeocodeArea(baseCentroid.lat, baseCentroid.lon)
      : Promise.resolve(null),
    getDailyLifeWithCache(city).catch(() => [] as import("@/types").DailyLifePlace[]),
    isUnlocked
      ? getPlaceConfirmations(city.slug).catch(() => new Map())
      : Promise.resolve(new Map<string, import("@/lib/confirmations").PlaceConfirmData>()),
  ]);

  const algorithmicSummary = computeCitySummary(city, places, areaName ?? undefined);

  const essentialsPlaces: Place[] = dailyLifePlaces
    .slice()
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((p) => {
      const routineFit: "high" | "medium" | "low" =
        p.distanceKm < 0.6 ? "high" : p.distanceKm < 1.5 ? "medium" : "low";
      const convenience: "high" | "medium" | "low" =
        p.distanceKm < 0.6 ? "high" : p.distanceKm < 1.5 ? "medium" : "low";
      const typeLabel =
        p.type === "grocery"
          ? "Grocery"
          : p.type === "convenience"
            ? "Convenience"
            : p.type === "pharmacy"
              ? "Pharmacy"
              : "Laundry";
      return {
        id: `daily-${p.id}`,
        name: p.name,
        category: "essential",
        lat: p.lat,
        lon: p.lon,
        distanceKm: p.distanceKm,
        confidence: {
          routineFit,
          convenience,
          routineSupport: routineFit,
        },
        bestFor: ["routine_support"],
        explanation:
          p.distanceKm < 0.6
            ? `${typeLabel} within walking distance of your base area.`
            : `${typeLabel} is available nearby; plan a short ride or walk.`,
      };
    });

  // Append honest daily-life gap signals to the generic summary.
  // Only when no KV narrative overrides the text — KV narrative wins.
  const summaryEnhanced = kvNarrative
    ? algorithmicSummary
    : appendDailyLifeSignals(algorithmicSummary, dailyLifePlaces);

  // Merge KV narrative on top of algorithmic summary (KV wins for text fields)
  const summary = {
    ...summaryEnhanced,
    ...(kvNarrative && {
      summaryText: kvNarrative.summaryText,
      recommendedArea: kvNarrative.baseAreaName,
      areaReason: kvNarrative.baseAreaReason,
    }),
  };

  // ── Personalized stay fit score ──────────────────────────────────────────
  // Computed when URL params ?purpose= and ?workStyle= are present.
  // Returns null for users with no intent — generic output unchanged.
  // Use summary.recommendedArea — it already incorporates the KV narrative's curated
  // baseAreaName (e.g. "La Punta") and falls back to the reverse-geocoded area name.
  // This ensures BestBaseCard shows real curated names, not "Central Puerto Escondido".
  const stayFit = intent
    ? computeStayFitScore(places, dailyLifePlaces, city, intent, summary.recommendedArea)
    : null;

  if (stayFit) {
    console.log(
      `[stay-fit] ${city.slug} profile=${stayFit.profile} score=${stayFit.fitScore} (${stayFit.fitLabel}) ` +
      `work=${stayFit.scoreBreakdown.workFit} life=${stayFit.scoreBreakdown.dailyLifeFit} ` +
      `flags=${stayFit.redFlags.length}`
    );
  }

  // ── LLM stay-fit narrative + micro-area narratives ────────────────────────
  // Runs in the main server component so loading.tsx covers the full page.
  let stayFitNarrative: StayFitNarrative | null = null;
  let microAreaNarratives: MicroAreaNarrative[] | null = null;
  if (stayFit) {
    const enrichedResult = await getOrGenerateEnrichedNarrative(
      city.slug, city.name, city.country, stayFit, places
    ).catch(() => null);

    if (enrichedResult) {
      stayFitNarrative = enrichedResult.narrative;
      microAreaNarratives = enrichedResult.microAreaNarratives;
    }

    // Fall back to basic narrative if enrichment failed
    if (!stayFitNarrative) {
      stayFitNarrative = await getOrGenerateStayFitNarrative(
        stayFit, city.slug, city.name, city.country
      ).catch(() => null);
    }
  }

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
          daily_life_places: dailyLifePlaces.length,
          stay_fit_profile: stayFit?.profile ?? null,
          stay_fit_score: stayFit?.fitScore ?? null,
          stay_fit_label: stayFit?.fitLabel ?? null,
          stay_fit_work: stayFit?.scoreBreakdown.workFit ?? null,
          stay_fit_life: stayFit?.scoreBreakdown.dailyLifeFit ?? null,
          stay_fit_red_flags: stayFit?.redFlags.length ?? 0,
        }}
      />

      {/* Data coverage notice — only shown for partial/limited data */}
      {dataCoverage !== "good" && dataCoverage !== "none" && (
        <CoverageNotice city={city.name} level={dataCoverage} />
      )}

      {/* Post-unlock value reveal: make the "what now" path explicit immediately. */}
      {justUnlocked && isUnlocked && (
        <div className="rounded-2xl border border-teal/30 bg-teal/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
            Unlocked successfully
          </p>
          <p className="mt-1 text-sm text-bark">
            {intent
              ? "Full setup is now available. Compare the top micro-areas, check daily logistics, and shortlist your work and essentials before booking."
              : "Full setup is now available. Shape this stay to apply your intent, then compare micro-areas with the right profile."}
          </p>
        </div>
      )}

      {/* Routine map — first thing the user sees; locked places as grey dots */}
      {(baseCentroid || places.length > 0) && (
        <CityMap
          citySlug={city.slug}
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
          dailyLifePlaces={dailyLifePlaces}
          intent={intent}
          baseAreaName={stayFit?.baseArea ?? summary.recommendedArea ?? null}
          microAreas={
            microAreaNarratives
              ?.filter((m) => m.center !== undefined)
              .map((m) => ({
                id: m.microAreaId,
                name: m.name,
                center: m.center!,
                radius_km: m.radius_km ?? 1.0,
                rank: m.rank,
                score: m.score,
                hasConstraintBreakers: m.hasConstraintBreakers,
              })) ?? undefined
          }
        />
      )}

      {/* Summary cards:
          - With intent (stayFit computed): RoutineSummaryCard full-width — BestBaseCard is the main card
          - Without intent: RoutineSummaryCard + RecommendedAreaCard — IntentPrompt sits below to activate BestBaseCard */}
      {stayFit ? (
        <RoutineSummaryCard summary={summary} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <RoutineSummaryCard summary={summary} />
          <RecommendedAreaCard
            summary={summary}
            centroidLat={baseCentroid?.lat}
            centroidLon={baseCentroid?.lon}
          />
        </div>
      )}

      <DecisionNextStepCard
        isUnlocked={isUnlocked}
        hasIntent={Boolean(intent)}
      />

      {/* Intent-aware main card — the primary product moment.
          · intent present + stayFit computed → BestBaseCard answers "where to base myself"
          · intent absent → IntentPrompt lets the user shape the stay and activate BestBaseCard
          · intent present but stayFit null → should not happen (stayFit is computed whenever intent exists) */}
      <div id="decision-flow">
        {intent && stayFit ? (
          microAreaNarratives && microAreaNarratives.length > 0 ? (
            isUnlocked ? (
              <MicroAreaStack
                microAreaNarratives={microAreaNarratives}
                intent={`${intent.purpose} + ${intent.workStyle} work`}
                cityName={city.name}
              citySlug={city.slug}
              />
            ) : (
              <BestBaseCard
                isUnlocked={false}
                cityName={city.name}
                citySlug={city.slug}
                country={city.country}
                stayFit={{ ...stayFit, baseArea: microAreaNarratives[0]?.name ?? stayFit.baseArea }}
                intent={intent}
                narrativeText={null}
                lowConfidence={dataCoverage === "limited"}
              />
            )
          ) : (
            <BestBaseCard
              isUnlocked={isUnlocked}
              cityName={city.name}
              citySlug={city.slug}
              country={city.country}
              stayFit={stayFit}
              intent={intent}
              narrativeText={stayFitNarrative}
              baseNeighborhoodHref={(() => {
                const curatedConfig = CURATED_NEIGHBORHOODS[city.slug];
                if (!curatedConfig) return null;
                const base = stayFit.baseArea.toLowerCase().trim();
                const match = curatedConfig.neighborhoods.find((n) => {
                  const name = n.name.toLowerCase().trim();
                  return name === base || name.includes(base) || base.includes(name);
                });
                if (!match) return null;
                const params = new URLSearchParams({
                  lat: String(match.lat),
                  lon: String(match.lon),
                  name: match.name,
                  country: "",
                  parentCity: city.name,
                  bbox: match.bbox.join(","),
                  purpose: intent.purpose,
                  workStyle: intent.workStyle,
                  ...(intent.dailyBalance ? { dailyBalance: intent.dailyBalance } : {}),
                });
                return `/city/${match.slug}?${params.toString()}`;
              })()}
              lowConfidence={dataCoverage === "limited"}
            />
          )
        ) : !intent ? (
          <div id="intent-prompt-section">
            <IntentPrompt
              citySlug={city.slug}
              cityName={city.name}
              prefillPurpose={prefillPurpose}
            />
          </div>
        ) : null}
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
        firstPlaceContext={
          intent && stayFit && workPlaces.length > 0
            ? `For ${(() => {
                const p = intent.purpose;
                const w = intent.workStyle;
                if (p === "work_first") return "focused remote work";
                const pLabel: Record<string, string> = { surf: "surf", dive: "diving", hike: "hiking", yoga: "yoga", kite: "kite", exploring: "exploring" };
                const wLabel: Record<string, string> = { light: "light work", balanced: "balanced work", heavy: "intensive work" };
                return `${pLabel[p] ?? p} + ${wLabel[w]}`;
              })()}: closest work option near ${stayFit.baseArea}`
            : undefined
        }
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

      <PlaceSection
        title="Essentials"
        subtitle="Grocery, pharmacy, and practical everyday needs near your base"
        places={essentialsPlaces}
        freeCount={FREE_ESSENTIALS}
        isUnlocked={isUnlocked}
        citySlug={city.slug}
        neighborhoodSlug={city.slug}
        emptyMessage="No daily-life essentials found near this base yet."
      />

      {/* Paywall — shown only when locked, there is locked content, and BestBaseCard
          is NOT already handling the unlock CTA. When intent is present, BestBaseCard
          is the single conversion point — two unlock CTAs is confusing. */}
      {!isUnlocked && hasLockedContent && !stayFit && (
        <PaywallCard
          citySlug={city.slug}
          cityName={city.name}
          country={city.country}
          lockedCounts={lockedCounts}
          hookLine={hookLine}
          hasIntent={!!intent}
          intent={intent}
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

      {!isUnlocked && <RestoreUnlocksCard />}

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

function DecisionNextStepCard({
  isUnlocked,
  hasIntent,
}: {
  isUnlocked: boolean;
  hasIntent: boolean;
}) {
  if (!hasIntent) {
    return (
      <div className="rounded-2xl border border-dune bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
          Next step
        </p>
        <p className="mt-1 text-sm text-bark">
          Shape this stay first so recommendations match how you travel and work.
          {" "}
          <a href="#intent-prompt-section" className="font-medium text-teal underline underline-offset-2">
            Start now
          </a>
          .
        </p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="rounded-2xl border border-dune bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
          Next step
        </p>
        <p className="mt-1 text-sm text-bark">
          Review your best base card below, then unlock full micro-area setup to compare all options with logistics and tradeoffs.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dune bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
        Next step
      </p>
      <p className="mt-1 text-sm text-bark">
        Compare all ranked micro-areas below, then shortlist places in Work, Essentials, and Wellbeing to finalize your base decision.
      </p>
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
          TrustStay — know your base before you arrive.
        </p>
      </div>
    </footer>
  );
}
