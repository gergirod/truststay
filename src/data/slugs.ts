/**
 * Single source of truth for all city/destination slugs.
 * Imported by:
 *   - src/app/city/[slug]/page.tsx  → generateStaticParams (pre-render at build)
 *   - src/app/sitemap.ts            → sitemap.xml for Google discovery
 *
 * Keep this in sync whenever you add new destinations.
 */
export const KNOWN_CITY_SLUGS: string[] = [
  // ── Major multi-neighborhood cities ─────────────────────────────────────
  "lisbon", "medellin", "bali", "mexico-city", "buenos-aires",
  "chiang-mai", "berlin", "barcelona", "amsterdam", "ho-chi-minh-city",
  "tbilisi", "budapest", "prague", "bansko", "bogota",
  "taipei", "kuala-lumpur",

  // ── Mexico ───────────────────────────────────────────────────────────────
  "playa-del-carmen", "oaxaca", "puerto-escondido", "sayulita",
  "tulum", "todos-santos", "mazunte", "troncones", "zihuatanejo",
  "punta-mita", "la-saladita",
  "huatulco", "la-paz",
  "san-cristobal-de-las-casas", "guanajuato", "merida",
  "cozumel", "isla-mujeres", "bacalar",
  "guadalajara", "puerto-vallarta",
  "tepoztlan",

  // ── Belize ───────────────────────────────────────────────────────────────
  "caye-caulker", "san-pedro-belize", "placencia",

  // ── Guatemala ────────────────────────────────────────────────────────────
  "antigua-guatemala", "lago-atitlan",
  "san-marcos-la-laguna", "san-pedro-la-laguna", "panajachel",
  "quetzaltenango", "el-paredon", "acatenango", "monterrico", "champerico",

  // ── Honduras ─────────────────────────────────────────────────────────────
  "roatan", "utila", "copan-ruinas",

  // ── El Salvador ──────────────────────────────────────────────────────────
  "el-tunco", "el-zonte", "las-flores-el-salvador", "mizata", "punta-roca-la-libertad",

  // ── Nicaragua ────────────────────────────────────────────────────────────
  "san-juan-del-sur", "popoyo", "gigante", "leon", "granada", "ometepe",
  "playa-colorado-nicaragua", "las-penitas",

  // ── Costa Rica ───────────────────────────────────────────────────────────
  "santa-teresa", "nosara", "tamarindo", "dominical", "montezuma",
  "jaco", "puerto-viejo", "pavones", "monteverde", "arenal",
  "uvita", "san-jose-costa-rica", "playa-hermosa-jaco", "mal-pais",

  // ── Panama ───────────────────────────────────────────────────────────────
  "bocas-del-toro", "boquete", "santa-catalina", "pedasi",
  "el-valle-de-anton", "coiba", "panama-city", "playa-venao", "morro-negrito",

  // ── Colombia ─────────────────────────────────────────────────────────────
  "minca", "palomino", "santa-marta", "cartagena",
  "villa-de-leyva", "salento", "taganga", "san-andres", "cabo-de-la-vela",
  "nuqui", "cali", "tayrona", "juanchaco",

  // ── Ecuador ──────────────────────────────────────────────────────────────
  "montanita", "olon", "banos", "canoa", "cuenca",
  "quilotoa", "vilcabamba", "mindo", "galapagos", "ayampe", "quito",

  // ── Peru ─────────────────────────────────────────────────────────────────
  "mancora", "huanchaco", "huaraz", "cusco",
  "lobitos", "chicama", "ollantaytambo", "pisac",
  "lima", "arequipa", "paracas", "chachapoyas", "punta-hermosa", "cerro-azul-peru", "pacasmayo",

  // ── Bolivia ──────────────────────────────────────────────────────────────
  "sucre", "coroico", "la-paz-bolivia", "sorata", "rurrenabaque",

  // ── Chile ────────────────────────────────────────────────────────────────
  "pucon", "san-pedro-de-atacama", "pichilemu", "puerto-natales", "iquique",
  "cajon-del-maipo", "cochamo", "futaleufu", "conguillo",
  "hanga-roa", "santiago", "valparaiso", "la-paloma",

  // ── Argentina ────────────────────────────────────────────────────────────
  "bariloche", "mendoza", "salta", "el-chalten", "jujuy",
  "puerto-madryn", "ushuaia",
  "tilcara", "purmamarca", "humahuaca", "iruya", "cafayate",
  "uspallata", "potrerillos",
  "el-bolson", "san-martin-de-los-andes", "villa-la-angostura", "esquel",
  "cordoba", "rosario", "mar-del-plata", "chapadmalal", "quequen", "miramar",
  "necochea", "pinamar", "villa-gesell", "santa-clara-del-mar", "mar-de-ajo",

  // ── Brazil ───────────────────────────────────────────────────────────────
  "florianopolis", "itacare", "jericoacoara",
  "pipa", "paraty", "arraial-do-cabo",
  "fernando-de-noronha", "abrolhos",
  "cumbuco", "sao-miguel-do-gostoso", "lencois", "bonito",
  "praia-do-rosa", "trancoso", "alto-paraiso", "ubatuba", "saquarema",
  "maresias", "guaruja", "garopaba", "imbituba", "torres-rs", "bombinhas",
  "sao-paulo", "rio-de-janeiro", "fortaleza",
  "curitiba", "porto-alegre", "recife", "salvador",

  // ── Uruguay ──────────────────────────────────────────────────────────────
  "punta-del-este", "punta-del-diablo", "montevideo", "la-paloma",
  "la-pedrera", "jose-ignacio", "piriapolis", "aguas-dulces",
  "cabo-polonio", "punta-colorada", "punta-negra-uruguay",

  // ── Paraguay ─────────────────────────────────────────────────────────────
  "asuncion",

  // ── Venezuela ────────────────────────────────────────────────────────────
  "los-roques",

  // ── Dominican Republic ───────────────────────────────────────────────────
  "cabarete", "las-terrenas", "bayahibe", "encuentro-cabarete",

  // ── Caribbean ─────────────────────────────────────────────────────────────
  "bonaire", "curacao", "aruba",
  "martinique", "guadeloupe",
  "dominica", "barbados",
  "rincon", "san-juan-puerto-rico", "aguadilla", "isabela-puerto-rico", "bathsheba-barbados",

  // ── Central America additions ─────────────────────────────────────────────
  "mahahual", "cahuita", "providencia",

  // ── Kite & wind destinations ─────────────────────────────────────────────
  "prea", "atins", "canoa-quebrada", "la-ventana", "los-barriles",
  "la-ventana",

  // ── Hike destinations ─────────────────────────────────────────────────────
  "tayrona",

  // ── Yoga / wellness ──────────────────────────────────────────────────────
  // (covered by existing slugs above)
];

/**
 * Higher-priority slugs for sitemap: major cities + most-searched destinations.
 * These get priority=0.9 in the sitemap.
 */
export const HIGH_PRIORITY_SLUGS = new Set([
  "lisbon", "medellin", "bali", "mexico-city", "buenos-aires",
  "chiang-mai", "berlin", "barcelona", "amsterdam", "ho-chi-minh-city",
  "tbilisi", "budapest", "prague", "bansko", "bogota",
  "taipei", "kuala-lumpur",
  "tulum", "playa-del-carmen", "oaxaca", "puerto-escondido",
  "sayulita", "santa-teresa", "nosara", "tamarindo",
  "medellin", "cartagena", "san-andres",
  "cusco", "lima", "rio-de-janeiro", "sao-paulo",
  "santiago", "montevideo", "buenos-aires",
  "san-juan-del-sur", "antigua-guatemala", "bocas-del-toro",
]);
