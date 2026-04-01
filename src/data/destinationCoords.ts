/**
 * Coordinates and metadata for every destination shown on the homepage
 * discovery map. Duplicates across categories are deduplicated — the first
 * category listed here wins (priority: Surf > Dive > Hike > Yoga > Kite > Hub).
 */

export type DestinationCategory =
  | "Surf"
  | "Dive"
  | "Hike"
  | "Yoga & wellness"
  | "Kite & wind"
  | "Remote work hubs";

export interface DestinationPin {
  slug: string;
  label: string;
  lat: number;
  lon: number;
  category: DestinationCategory;
}

export const CATEGORY_COLORS: Record<DestinationCategory, string> = {
  "Surf":             "#E07A5F",  // coral
  "Dive":             "#4A8FA8",  // ocean blue
  "Hike":             "#7BA05B",  // forest green
  "Yoga & wellness":  "#D4956A",  // warm amber
  "Kite & wind":      "#8B7EC8",  // muted purple
  "Remote work hubs": "#8FB7B3",  // brand teal
};

export const CATEGORY_EMOJIS: Record<DestinationCategory, string> = {
  "Surf":             "🏄",
  "Dive":             "🤿",
  "Hike":             "⛰️",
  "Yoga & wellness":  "🧘",
  "Kite & wind":      "🪁",
  "Remote work hubs": "💻",
};

export const DESTINATION_PINS: DestinationPin[] = [
  // ── SURF ───────────────────────────────────────────────────────────────────
  { slug: "puerto-escondido",    label: "Puerto Escondido",    category: "Surf",             lat: 15.867,  lon: -97.063  },
  { slug: "sayulita",            label: "Sayulita",            category: "Surf",             lat: 20.869,  lon: -105.561 },
  { slug: "troncones",           label: "Troncones",           category: "Surf",             lat: 17.963,  lon: -101.913 },
  { slug: "todos-santos",        label: "Todos Santos",        category: "Surf",             lat: 23.449,  lon: -110.223 },
  { slug: "mazunte",             label: "Mazunte",             category: "Surf",             lat: 15.661,  lon: -96.536  },
  { slug: "tulum",               label: "Tulum",               category: "Surf",             lat: 20.211,  lon: -87.465  },
  { slug: "el-tunco",            label: "El Tunco",            category: "Surf",             lat: 13.500,  lon: -89.397  },
  { slug: "el-zonte",            label: "El Zonte",            category: "Surf",             lat: 13.508,  lon: -89.435  },
  { slug: "popoyo",              label: "Popoyo",              category: "Surf",             lat: 11.533,  lon: -85.983  },
  { slug: "gigante",             label: "Gigante",             category: "Surf",             lat: 11.500,  lon: -85.950  },
  { slug: "san-juan-del-sur",    label: "San Juan del Sur",    category: "Surf",             lat: 11.250,  lon: -85.869  },
  { slug: "el-paredon",          label: "El Paredon",          category: "Surf",             lat: 13.900,  lon: -91.483  },
  { slug: "santa-teresa",        label: "Santa Teresa",        category: "Surf",             lat: 9.650,   lon: -85.167  },
  { slug: "nosara",              label: "Nosara",              category: "Surf",             lat: 9.983,   lon: -85.650  },
  { slug: "tamarindo",           label: "Tamarindo",           category: "Surf",             lat: 10.300,  lon: -85.840  },
  { slug: "dominical",           label: "Dominical",           category: "Surf",             lat: 9.256,   lon: -83.863  },
  { slug: "jaco",                label: "Jacó",                category: "Surf",             lat: 9.533,   lon: -84.633  },
  { slug: "pavones",             label: "Pavones",             category: "Surf",             lat: 8.394,   lon: -83.135  },
  { slug: "santa-catalina",      label: "Santa Catalina",      category: "Surf",             lat: 7.460,   lon: -81.280  },
  { slug: "playa-venao",         label: "Playa Venao",         category: "Surf",             lat: 7.417,   lon: -80.183  },
  { slug: "rincon",              label: "Rincón",              category: "Surf",             lat: 18.340,  lon: -67.250  },
  { slug: "montanita",           label: "Montañita",           category: "Surf",             lat: -1.823,  lon: -80.756  },
  { slug: "canoa",               label: "Canoa",               category: "Surf",             lat: -0.483,  lon: -80.467  },
  { slug: "ayampe",              label: "Ayampe",              category: "Surf",             lat: -1.683,  lon: -80.817  },
  { slug: "mancora",             label: "Máncora",             category: "Surf",             lat: -4.107,  lon: -81.044  },
  { slug: "lobitos",             label: "Lobitos",             category: "Surf",             lat: -4.450,  lon: -81.283  },
  { slug: "chicama",             label: "Chicama",             category: "Surf",             lat: -7.700,  lon: -79.450  },
  { slug: "huanchaco",           label: "Huanchaco",           category: "Surf",             lat: -8.083,  lon: -79.117  },
  { slug: "jericoacoara",        label: "Jericoacoara",        category: "Surf",             lat: -2.797,  lon: -40.514  },
  { slug: "itacare",             label: "Itacaré",             category: "Surf",             lat: -14.277, lon: -38.999  },
  { slug: "pipa",                label: "Pipa",                category: "Surf",             lat: -6.227,  lon: -35.047  },
  { slug: "arraial-do-cabo",     label: "Arraial do Cabo",     category: "Surf",             lat: -22.966, lon: -42.024  },
  { slug: "praia-do-rosa",       label: "Praia do Rosa",       category: "Surf",             lat: -28.117, lon: -48.650  },
  { slug: "punta-del-diablo",    label: "Punta del Diablo",    category: "Surf",             lat: -34.000, lon: -53.550  },
  { slug: "pichilemu",           label: "Pichilemu",           category: "Surf",             lat: -34.387, lon: -72.010  },

  // ── DIVE ───────────────────────────────────────────────────────────────────
  { slug: "cozumel",             label: "Cozumel",             category: "Dive",             lat: 20.423,  lon: -86.922  },
  { slug: "isla-mujeres",        label: "Isla Mujeres",        category: "Dive",             lat: 21.233,  lon: -86.733  },
  { slug: "playa-del-carmen",    label: "Playa del Carmen",    category: "Dive",             lat: 20.630,  lon: -87.074  },
  { slug: "mahahual",            label: "Mahahual",            category: "Dive",             lat: 18.714,  lon: -87.703  },
  { slug: "huatulco",            label: "Huatulco",            category: "Dive",             lat: 15.750,  lon: -96.117  },
  { slug: "roatan",              label: "Roatán",              category: "Dive",             lat: 16.329,  lon: -86.523  },
  { slug: "utila",               label: "Utila",               category: "Dive",             lat: 16.094,  lon: -86.925  },
  { slug: "caye-caulker",        label: "Caye Caulker",        category: "Dive",             lat: 17.733,  lon: -88.025  },
  { slug: "san-pedro-belize",    label: "San Pedro",           category: "Dive",             lat: 17.917,  lon: -87.967  },
  { slug: "placencia",           label: "Placencia",           category: "Dive",             lat: 16.520,  lon: -88.363  },
  { slug: "bocas-del-toro",      label: "Bocas del Toro",      category: "Dive",             lat: 9.350,   lon: -82.250  },
  { slug: "coiba",               label: "Coiba",               category: "Dive",             lat: 7.467,   lon: -81.717  },
  { slug: "cahuita",             label: "Cahuita",             category: "Dive",             lat: 9.747,   lon: -82.843  },
  { slug: "san-andres",          label: "San Andrés",          category: "Dive",             lat: 12.583,  lon: -81.700  },
  { slug: "providencia",         label: "Providencia",         category: "Dive",             lat: 13.350,  lon: -81.367  },
  { slug: "taganga",             label: "Taganga",             category: "Dive",             lat: 11.267,  lon: -74.183  },
  { slug: "bayahibe",            label: "Bayahíbe",            category: "Dive",             lat: 18.367,  lon: -68.783  },
  { slug: "las-terrenas",        label: "Las Terrenas",        category: "Dive",             lat: 19.317,  lon: -69.533  },
  { slug: "bonito",              label: "Bonito",              category: "Dive",             lat: -21.122, lon: -56.487  },

  // ── HIKE ───────────────────────────────────────────────────────────────────
  { slug: "oaxaca",              label: "Oaxaca",              category: "Hike",             lat: 17.073,  lon: -96.727  },
  { slug: "san-cristobal-de-las-casas", label: "San Cristóbal", category: "Hike",           lat: 16.737,  lon: -92.638  },
  { slug: "lago-atitlan",        label: "Lago Atitlán",        category: "Hike",             lat: 14.700,  lon: -91.200  },
  { slug: "acatenango",          label: "Acatenango",          category: "Hike",             lat: 14.502,  lon: -90.876  },
  { slug: "antigua-guatemala",   label: "Antigua Guatemala",   category: "Hike",             lat: 14.559,  lon: -90.730  },
  { slug: "quetzaltenango",      label: "Quetzaltenango",      category: "Hike",             lat: 14.846,  lon: -91.518  },
  { slug: "ometepe",             label: "Ometepe",             category: "Hike",             lat: 11.483,  lon: -85.567  },
  { slug: "copan-ruinas",        label: "Copán Ruinas",        category: "Hike",             lat: 14.844,  lon: -89.142  },
  { slug: "boquete",             label: "Boquete",             category: "Hike",             lat: 8.778,   lon: -82.440  },
  { slug: "el-valle-de-anton",   label: "El Valle de Antón",   category: "Hike",             lat: 8.600,   lon: -80.117  },
  { slug: "monteverde",          label: "Monteverde",          category: "Hike",             lat: 10.300,  lon: -84.817  },
  { slug: "arenal",              label: "Arenal",              category: "Hike",             lat: 10.463,  lon: -84.702  },
  { slug: "minca",               label: "Minca",               category: "Hike",             lat: 11.133,  lon: -74.233  },
  { slug: "tayrona",             label: "Tayrona",             category: "Hike",             lat: 11.317,  lon: -74.000  },
  { slug: "villa-de-leyva",      label: "Villa de Leyva",      category: "Hike",             lat: 5.634,   lon: -73.525  },
  { slug: "banos",               label: "Baños",               category: "Hike",             lat: -1.393,  lon: -78.427  },
  { slug: "quilotoa",            label: "Quilotoa",            category: "Hike",             lat: -0.867,  lon: -78.833  },
  { slug: "mindo",               label: "Mindo",               category: "Hike",             lat: 0.050,   lon: -78.767  },
  { slug: "huaraz",              label: "Huaraz",              category: "Hike",             lat: -9.528,  lon: -77.528  },
  { slug: "cusco",               label: "Cusco",               category: "Hike",             lat: -13.532, lon: -71.968  },
  { slug: "ollantaytambo",       label: "Ollantaytambo",       category: "Hike",             lat: -13.259, lon: -72.263  },
  { slug: "chachapoyas",         label: "Chachapoyas",         category: "Hike",             lat: -6.230,  lon: -77.873  },
  { slug: "sorata",              label: "Sorata",              category: "Hike",             lat: -15.776, lon: -68.650  },
  { slug: "rurrenabaque",        label: "Rurrenabaque",        category: "Hike",             lat: -14.440, lon: -67.525  },
  { slug: "lencois",             label: "Lençóis",             category: "Hike",             lat: -12.564, lon: -41.393  },
  { slug: "alto-paraiso",        label: "Alto Paraíso",        category: "Hike",             lat: -14.133, lon: -47.517  },
  { slug: "bariloche",           label: "Bariloche",           category: "Hike",             lat: -41.133, lon: -71.317  },
  { slug: "el-chalten",          label: "El Chaltén",          category: "Hike",             lat: -49.333, lon: -72.883  },
  { slug: "el-bolson",           label: "El Bolsón",           category: "Hike",             lat: -41.964, lon: -71.533  },
  { slug: "puerto-natales",      label: "Puerto Natales",      category: "Hike",             lat: -51.733, lon: -72.500  },
  { slug: "pucon",               label: "Pucón",               category: "Hike",             lat: -39.267, lon: -71.983  },
  { slug: "san-pedro-de-atacama",label: "San Pedro de Atacama",category: "Hike",             lat: -22.908, lon: -68.200  },
  { slug: "mendoza",             label: "Mendoza",             category: "Hike",             lat: -32.891, lon: -68.827  },
  { slug: "jujuy",               label: "Jujuy",               category: "Hike",             lat: -24.186, lon: -65.300  },

  // ── YOGA & WELLNESS ────────────────────────────────────────────────────────
  { slug: "tepoztlan",           label: "Tepoztlán",           category: "Yoga & wellness",  lat: 18.986,  lon: -99.098  },
  { slug: "bacalar",             label: "Bacalar",             category: "Yoga & wellness",  lat: 18.674,  lon: -88.400  },
  { slug: "san-marcos-la-laguna",label: "San Marcos La Laguna",category: "Yoga & wellness",  lat: 14.730,  lon: -91.261  },
  { slug: "san-pedro-la-laguna", label: "San Pedro La Laguna", category: "Yoga & wellness",  lat: 14.693,  lon: -91.276  },
  { slug: "panajachel",          label: "Panajachel",          category: "Yoga & wellness",  lat: 14.742,  lon: -91.157  },
  { slug: "montezuma",           label: "Montezuma",           category: "Yoga & wellness",  lat: 9.660,   lon: -85.072  },
  { slug: "puerto-viejo",        label: "Puerto Viejo",        category: "Yoga & wellness",  lat: 9.656,   lon: -82.754  },
  { slug: "uvita",               label: "Uvita",               category: "Yoga & wellness",  lat: 9.158,   lon: -83.734  },
  { slug: "palomino",            label: "Palomino",            category: "Yoga & wellness",  lat: 11.250,  lon: -73.583  },
  { slug: "olon",                label: "Olón",                category: "Yoga & wellness",  lat: -1.817,  lon: -80.750  },
  { slug: "vilcabamba",          label: "Vilcabamba",          category: "Yoga & wellness",  lat: -4.267,  lon: -79.217  },
  { slug: "pisac",               label: "Pisac",               category: "Yoga & wellness",  lat: -13.417, lon: -71.850  },
  { slug: "coroico",             label: "Coroico",             category: "Yoga & wellness",  lat: -16.183, lon: -67.717  },
  { slug: "trancoso",            label: "Trancoso",            category: "Yoga & wellness",  lat: -16.583, lon: -39.083  },
  { slug: "paraty",              label: "Paraty",              category: "Yoga & wellness",  lat: -23.217, lon: -44.717  },

  // ── KITE & WIND ────────────────────────────────────────────────────────────
  { slug: "cabarete",            label: "Cabarete",            category: "Kite & wind",      lat: 19.767,  lon: -70.417  },
  { slug: "cumbuco",             label: "Cumbuco",             category: "Kite & wind",      lat: -3.500,  lon: -38.741  },
  { slug: "prea",                label: "Preá",                category: "Kite & wind",      lat: -2.583,  lon: -40.433  },
  { slug: "atins",               label: "Atins",               category: "Kite & wind",      lat: -2.517,  lon: -43.117  },
  { slug: "canoa-quebrada",      label: "Canoa Quebrada",      category: "Kite & wind",      lat: -4.517,  lon: -37.717  },
  { slug: "sao-miguel-do-gostoso",label: "São Miguel do Gostoso",category: "Kite & wind",   lat: -5.117,  lon: -35.633  },
  { slug: "cabo-de-la-vela",     label: "Cabo de la Vela",     category: "Kite & wind",      lat: 12.200,  lon: -72.417  },
  { slug: "la-ventana",          label: "La Ventana",          category: "Kite & wind",      lat: 24.050,  lon: -109.800 },
  { slug: "los-barriles",        label: "Los Barriles",        category: "Kite & wind",      lat: 23.700,  lon: -109.700 },
  { slug: "paracas",             label: "Paracas",             category: "Kite & wind",      lat: -13.833, lon: -76.250  },
  { slug: "iquique",             label: "Iquique",             category: "Kite & wind",      lat: -20.213, lon: -70.150  },
  { slug: "la-paloma",           label: "La Paloma",           category: "Kite & wind",      lat: -34.656, lon: -54.155  },

  // ── CARIBBEAN — Surf ──────────────────────────────────────────────────────
  { slug: "martinique",          label: "Martinique",          category: "Surf",             lat: 14.642,  lon: -61.024  },
  { slug: "barbados",            label: "Barbados",            category: "Surf",             lat: 13.193,  lon: -59.543  },
  { slug: "guadeloupe",          label: "Guadeloupe",          category: "Surf",             lat: 16.265,  lon: -61.551  },

  // ── CARIBBEAN — Dive ──────────────────────────────────────────────────────
  { slug: "bonaire",             label: "Bonaire",             category: "Dive",             lat: 12.150,  lon: -68.272  },
  { slug: "curacao",             label: "Curaçao",             category: "Dive",             lat: 12.169,  lon: -68.990  },
  { slug: "aruba",               label: "Aruba",               category: "Dive",             lat: 12.521,  lon: -69.968  },
  { slug: "dominica",            label: "Dominica",            category: "Dive",             lat: 15.415,  lon: -61.371  },

  // ── CARIBBEAN — Hike ──────────────────────────────────────────────────────
  // (Martinique & Guadeloupe already pinned above; Dominica above)

  // ── CARIBBEAN — Kite (ABC islands are world-class kite) ───────────────────
  // Aruba, Bonaire, Curaçao also appear in Dive above — kite category
  // represented via the filter pills on the homepage

  // ── REMOTE WORK HUBS ───────────────────────────────────────────────────────
  { slug: "mexico-city",         label: "Mexico City",         category: "Remote work hubs", lat: 19.433,  lon: -99.133  },
  { slug: "guadalajara",         label: "Guadalajara",         category: "Remote work hubs", lat: 20.660,  lon: -103.350 },
  { slug: "puerto-vallarta",     label: "Puerto Vallarta",     category: "Remote work hubs", lat: 20.653,  lon: -105.225 },
  { slug: "merida",              label: "Mérida",              category: "Remote work hubs", lat: 20.967,  lon: -89.593  },
  { slug: "panama-city",         label: "Panama City",         category: "Remote work hubs", lat: 8.994,   lon: -79.520  },
  { slug: "san-jose-costa-rica", label: "San José CR",         category: "Remote work hubs", lat: 9.928,   lon: -84.091  },
  { slug: "granada",             label: "Granada",             category: "Remote work hubs", lat: 11.934,  lon: -85.956  },
  { slug: "san-juan-puerto-rico",label: "San Juan PR",         category: "Remote work hubs", lat: 18.466,  lon: -66.106  },
  { slug: "medellin",            label: "Medellín",            category: "Remote work hubs", lat: 6.244,   lon: -75.581  },
  { slug: "bogota",              label: "Bogotá",              category: "Remote work hubs", lat: 4.711,   lon: -74.072  },
  { slug: "cartagena",           label: "Cartagena",           category: "Remote work hubs", lat: 10.391,  lon: -75.479  },
  { slug: "santa-marta",         label: "Santa Marta",         category: "Remote work hubs", lat: 11.241,  lon: -74.214  },
  { slug: "cali",                label: "Cali",                category: "Remote work hubs", lat: 3.452,   lon: -76.532  },
  { slug: "salento",             label: "Salento",             category: "Remote work hubs", lat: 4.637,   lon: -75.572  },
  { slug: "quito",               label: "Quito",               category: "Remote work hubs", lat: -0.230,  lon: -78.524  },
  { slug: "cuenca",              label: "Cuenca",              category: "Remote work hubs", lat: -2.897,  lon: -79.005  },
  { slug: "lima",                label: "Lima",                category: "Remote work hubs", lat: -12.046, lon: -77.043  },
  { slug: "arequipa",            label: "Arequipa",            category: "Remote work hubs", lat: -16.399, lon: -71.535  },
  { slug: "sucre",               label: "Sucre",               category: "Remote work hubs", lat: -19.045, lon: -65.259  },
  { slug: "la-paz-bolivia",      label: "La Paz",              category: "Remote work hubs", lat: -16.500, lon: -68.150  },
  { slug: "sao-paulo",           label: "São Paulo",           category: "Remote work hubs", lat: -23.551, lon: -46.633  },
  { slug: "rio-de-janeiro",      label: "Rio de Janeiro",      category: "Remote work hubs", lat: -22.907, lon: -43.173  },
  { slug: "florianopolis",       label: "Florianópolis",       category: "Remote work hubs", lat: -27.595, lon: -48.548  },
  { slug: "curitiba",            label: "Curitiba",            category: "Remote work hubs", lat: -25.429, lon: -49.267  },
  { slug: "porto-alegre",        label: "Porto Alegre",        category: "Remote work hubs", lat: -30.035, lon: -51.218  },
  { slug: "recife",              label: "Recife",              category: "Remote work hubs", lat: -8.048,  lon: -34.877  },
  { slug: "salvador",            label: "Salvador",            category: "Remote work hubs", lat: -12.971, lon: -38.501  },
  { slug: "fortaleza",           label: "Fortaleza",           category: "Remote work hubs", lat: -3.717,  lon: -38.543  },
  { slug: "buenos-aires",        label: "Buenos Aires",        category: "Remote work hubs", lat: -34.604, lon: -58.382  },
  { slug: "montevideo",          label: "Montevideo",          category: "Remote work hubs", lat: -34.901, lon: -56.165  },
  { slug: "cordoba",             label: "Córdoba",             category: "Remote work hubs", lat: -31.420, lon: -64.189  },
  { slug: "rosario",             label: "Rosario",             category: "Remote work hubs", lat: -32.944, lon: -60.651  },
  { slug: "santiago",            label: "Santiago",            category: "Remote work hubs", lat: -33.449, lon: -70.669  },
  { slug: "valparaiso",          label: "Valparaíso",          category: "Remote work hubs", lat: -33.047, lon: -71.613  },
  { slug: "asuncion",            label: "Asunción",            category: "Remote work hubs", lat: -25.287, lon: -57.647  },
  { slug: "punta-del-este",      label: "Punta del Este",      category: "Remote work hubs", lat: -34.970, lon: -54.942  },
];
