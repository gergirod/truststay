/*
 * WRITING RULES (follow these exactly):
 * - Max 3 sentences. No fluff. Every sentence must answer: "which neighborhood and why?"
 * - Never use: "vibrant", "charming", "stunning", "world-class", "perfect for"
 * - Always specific: name the neighborhoods, the breaks, the streets, the issue
 * - Activity-first: the first sentence should name the activity or why people come
 * - Honest about limitations: mention wifi issues, noise, crowds, seasonality if relevant
 * - Third person, present tense
 * - Do not add entries for cities without curated neighborhoods or thin OSM coverage
 */

export interface CityIntro {
  /** 1–3 sentences. Honest, specific, activity-first. No fluff. */
  summary: string;
  /** Primary activity context */
  activity?: "surf" | "dive" | "hike" | "yoga" | "kite" | "work";
  /** Best months for the primary activity */
  bestMonths?: string;
}

export const CITY_INTROS: Record<string, CityIntro> = {

  // ── Mexico ────────────────────────────────────────────────────────────────

  "puerto-escondido": {
    summary:
      "Puerto Escondido divides into three zones: La Punta is the working-surfer base — walkable to Zicatela and the better cafés — Zicatela is the main break but louder and more party-focused, and the centro is inland and cheaper. The big swells that make Mexican Pipeline famous also make swimming dangerous on most days at Zicatela. Intermediate and advanced surfers time their trip April through October.",
    activity: "surf",
    bestMonths: "Apr – Oct (big swells)",
  },

  "sayulita": {
    summary:
      "Sayulita is small enough that neighborhood choice comes down to proximity to the main break versus quieter streets north of the plaza. The centro fills with day-trippers from Puerto Vallarta on weekends, affecting every café on the main street. Most long-stayers end up in the residential blocks north of the market.",
    activity: "surf",
    bestMonths: "Nov – Apr (dry season)",
  },

  "tulum": {
    summary:
      "Tulum separates into La Veleta and Aldea Zamá (the residential and coworking zone) and the hotel zone on the beach — expensive, loud, and not built for stays longer than a few nights. The cenote access is the main draw; work-from-anywhere infrastructure is adequate in the inland neighborhoods. Prices have risen sharply since 2021 — budget higher than Playa del Carmen.",
    activity: "yoga",
    bestMonths: "Nov – Apr (dry season)",
  },

  "playa-del-carmen": {
    summary:
      "Playa del Carmen works as a logistics hub: the Cozumel ferry runs daily, the Riviera Maya cenotes are within 30 minutes, and the bus to Tulum is frequent. The colonia neighborhoods north of 38th Avenue have lower noise and more long-term-stay infrastructure than the tourist strip on 5th Avenue. It is not a destination people romanticize, but it functions well for a 3–6 month base.",
    activity: "work",
    bestMonths: "Nov – May (dry season)",
  },

  "san-pancho": {
    summary:
      "San Pancho (San Francisco) is the low-key alternative to Sayulita — smaller, no major surf break, and less day-tripper traffic. The main beach has consistent shore break but isn't a destination wave; most surfers day-trip to Sayulita or Punta de Mita. The café scene is thin but growing, and the slower pace is the product.",
    activity: "surf",
    bestMonths: "Nov – Apr",
  },

  "todos-santos": {
    summary:
      "Todos Santos sits at the meeting point of Baja's desert and Pacific coast, with a surf beach (Playa Los Cerritos) 10 minutes south of town. The centro has a growing café and art scene with the best work infrastructure in southern Baja. The town is dry and dusty most of the year — it's not a beach-town setup, it's a desert-town-with-beach-access setup.",
    activity: "surf",
    bestMonths: "Oct – Apr (swell season)",
  },

  "zipolite": {
    summary:
      "Zipolite is Mexico's only official nude beach town — a 1km stretch with low-key posadas, a left point break at the west end (Playa del Amor), and almost no infrastructure beyond the basics. Internet is limited and unreliable outside a few spots. It's a detox destination — people come for the pace, not for work.",
    activity: "surf",
    bestMonths: "Apr – Oct",
  },

  // ── Central America ───────────────────────────────────────────────────────

  "nosara": {
    summary:
      "Nosara works because it's compact: Guiones has the consistent beach break and the highest café density, while Pelada is quieter and closer to the yoga studios. The road into Guiones turns to mud in rainy season, which filters out the short-stay crowd. Wifi has improved significantly since 2022 — most coworkings now deliver 50+ Mbps.",
    activity: "surf",
    bestMonths: "Dec – Apr (dry season)",
  },

  "santa-teresa": {
    summary:
      "Santa Teresa and Mal Pais are the same stretch of coast; the split is informal and mainly depends on where the accommodation is. The surf is more accessible than Nosara — multiple beach breaks across tide windows — but the main dirt road generates constant dust and noise year-round. The café and coworking scene has grown enough that a 3-month stay works without constant logistics friction.",
    activity: "surf",
    bestMonths: "Dec – Apr (dry season)",
  },

  "tamarindo": {
    summary:
      "Tamarindo is the most developed surf town in Costa Rica — better wifi, more restaurants, and larger coworking density than Nosara or Santa Teresa. The trade-off is that it's also the most crowded and commercially developed. It works well as a first or last stop on a trip rather than a primary 2–3 month base.",
    activity: "surf",
    bestMonths: "Dec – Apr",
  },

  "dominical": {
    summary:
      "Dominical is small and basic: a main beach break, a handful of cafés, and access to Parque Nacional Marino Ballena. The people who choose it over Tamarindo or Santa Teresa are optimizing for fewer tourists and a slower pace, not for work infrastructure. The surf is consistent year-round on the main beach break.",
    activity: "surf",
    bestMonths: "May – Nov (south swells)",
  },

  "bocas-del-toro": {
    summary:
      "Bocas del Toro is an archipelago — Bocas Town on Isla Colón is the hub with cafés and logistics; reaching other islands requires water taxis. The diving is good but not world-class; the draw is Caribbean pace, cheap accommodation, and access to reef snorkeling close to the docks. Internet in Bocas Town has improved but mobile data remains the reliable fallback for remote work.",
    activity: "dive",
    bestMonths: "Sep – Oct, Mar (clearest water)",
  },

  "el-tunco": {
    summary:
      "El Tunco is El Salvador's main surf town — a black-sand cove with a consistent left break. It's small and concentrated: three main streets with cafés, surf schools, and hostels. El Zonte, 15 minutes south, is quieter and has the coworking infrastructure that came with the Bitcoin Beach experiment.",
    activity: "surf",
    bestMonths: "Mar – Oct (swell season)",
  },

  // ── Caribbean ─────────────────────────────────────────────────────────────

  "roatan": {
    summary:
      "Roatán has the most organized dive infrastructure in Central America: all-inclusive dive packages, PADI courses, and wall/reef access directly from West Bay and West End. West End is the backpacker and dive strip; Sandy Bay is quieter and more residential. Internet is the consistent weak point — satellite is common in off-grid rentals.",
    activity: "dive",
    bestMonths: "Mar – Jun, Sep – Oct (best visibility)",
  },

  "caye-caulker": {
    summary:
      "Caye Caulker is one road wide and 1km long — everything is walkable. The Belize Barrier Reef is minutes offshore, and shark and ray snorkeling in the shallows is the entry-level draw. It's not a work base: internet is unreliable and accommodation is basic. Most people use it as a 3–5 day stop within a longer Belize or Yucatan trip.",
    activity: "dive",
    bestMonths: "Nov – Apr (dry season)",
  },

  "san-pedro-belize": {
    summary:
      "San Pedro has better infrastructure than Caye Caulker: actual restaurants, more reliable wifi, and a larger dive operator network. The northern part of Ambergris Caye requires golf carts or water taxis; most work infrastructure is concentrated near the main strip. It's the right choice if you want reef access with actual wifi.",
    activity: "dive",
    bestMonths: "Nov – Apr",
  },

  "cabarete": {
    summary:
      "Cabarete runs on kite and windsurf tourism — the trade winds are consistent June through August, and the kite school density on the main beach makes it one of the easiest places to learn. The beachfront strip is loud year-round; the neighborhoods behind the main road are quieter and better for stays longer than two weeks. Wifi varies by property — coworkings are the reliable fallback.",
    activity: "kite",
    bestMonths: "Jun – Aug (strongest wind)",
  },

  "las-terrenas": {
    summary:
      "Las Terrenas has a French expat community that built out the café and restaurant scene unusually well for a Caribbean beach town. Playa Bonita is the quieter alternative to the main Las Terrenas strip. Wind is consistent December through March for kite; outside those months conditions are less predictable.",
    activity: "kite",
    bestMonths: "Dec – Mar (wind season)",
  },

  "curacao": {
    summary:
      "Curaçao's diving centers on Willemstad and the southwest coast — shore dives directly off the road at spots like Mushroom Forest and Blue Room, with no boat required. Willemstad has the coworking and café infrastructure for a 1–2 month stay. The island has reliable fiber internet, which is unusual in the Caribbean.",
    activity: "dive",
    bestMonths: "Year-round (outside hurricane belt)",
  },

  "bonaire": {
    summary:
      "Bonaire is the shore-dive capital of the Caribbean — over 60 marked dive sites accessible by truck and tank rental, no boat needed. Kralendijk is the only real town; most dive infrastructure is along the west coast road. It's not a digital nomad hub, but the stable internet and walkable town make it viable for a 3–4 week stay.",
    activity: "dive",
    bestMonths: "Year-round",
  },

  // ── Colombia ──────────────────────────────────────────────────────────────

  "medellin-el-poblado": {
    summary:
      "El Poblado is the default Medellín base: café density, walkability, and the easiest access to coworkings. Laureles is quieter, more residential, slightly better value, and 15 minutes by metro — it's where most long-termers move after their first month. The city's spring-like climate is the product of altitude (1,500m), not latitude.",
    activity: "work",
    bestMonths: "Year-round",
  },

  "cartagena": {
    summary:
      "Cartagena's walled city is the aesthetic anchor but not the work base — noise and tourist density make sustained work difficult. Bocagrande is the functional residential alternative: quieter, closer to the sea, better wifi infrastructure. Visit the old city in the evenings; work from Bocagrande or Getsemaní during the day.",
    activity: "work",
    bestMonths: "Dec – Apr (dry season)",
  },

  "palomino": {
    summary:
      "Palomino is the quiet Caribbean coast option north of Santa Marta — accessible by bus, with surf and river-to-sea tubing as the main activities. Work infrastructure is minimal; it's a 3–5 day detour from a Santa Marta or Cartagena base rather than a primary stop. The beachfront strip is the commercial center; heading further from it gets noticeably quieter.",
    activity: "surf",
    bestMonths: "Dec – Mar",
  },

  // ── South America: Argentina ──────────────────────────────────────────────

  "bariloche": {
    summary:
      "Bariloche is a full-year destination: Cerro Catedral for ski season (July–September) and the Nahuel Huapi circuits for spring and summer hiking. The centro is functional but noisy; most longer stays cluster in the barrios west toward Llao Llao. Fiber internet arrived in most residential areas around 2021 — reliability is good.",
    activity: "hike",
    bestMonths: "Nov – Apr (hiking), Jul – Sep (ski)",
  },

  "el-chalten": {
    summary:
      "El Chaltén exists as a trailhead base for the Fitz Roy and Cerro Torre circuits — the village is one main road wide. Most trails are free and accessed directly from town; no guides required for the main routes. The season is November to March; outside those months most restaurants and several lodges close.",
    activity: "hike",
    bestMonths: "Nov – Mar",
  },

  "san-martin-de-los-andes": {
    summary:
      "San Martín is the calmer Patagonian base compared to Bariloche: smaller, less tour-bus traffic, and similar trail access in Lanín National Park. The Lácar lakefront zone has the highest café density; the residential areas behind the terminal are quieter and better value. It works as a 4–8 week slow-travel stop, not a full nomad hub.",
    activity: "hike",
    bestMonths: "Nov – Apr",
  },

  "tilcara": {
    summary:
      "Tilcara sits at 2,461m in the Quebrada de Humahuaca — altitude acclimatization takes 2–3 days before hiking. It's the most complete base in the Quebrada: more restaurants and accommodation than Purmamarca, better internet than Humahuaca. The Pucará ruins and Garganta del Diablo trail are walkable from town.",
    activity: "hike",
    bestMonths: "Apr – Oct (dry season)",
  },

  "cafayate": {
    summary:
      "Cafayate is a wine town with canyon access, not a surf or dive destination. The hikes through the Quebrada de las Conchas (Ruta 68) are among the most visually striking in northern Argentina — colored rock formations across 40km of road. Work infrastructure is basic: no coworkings, but most rentals in the centro have usable wifi.",
    activity: "hike",
    bestMonths: "Apr – Oct",
  },

  "el-bolson": {
    summary:
      "El Bolsón is the hippie-market town of Argentine Patagonia with direct access to Cerro Piltriquitrón and the surrounding Andean trails. The town center is compact and walkable; most accommodation is in the blocks between the plaza and the river. Internet quality is uneven — confirm with hosts before booking for remote work.",
    activity: "hike",
    bestMonths: "Nov – Apr",
  },

  "buenos-aires": {
    summary:
      "Palermo divides further into Soho (bars, cafés, galleries) and Hollywood (more residential, slightly quieter) — both work as long-term bases. The economic situation affects pricing unpredictably; budget in USD, change at a bureau de change, and avoid relying on card rates. Coworking density in Palermo and Belgrano is among the highest in Latin America.",
    activity: "work",
    bestMonths: "Mar – May, Sep – Nov",
  },

  // ── South America: Peru ───────────────────────────────────────────────────

  "mancora": {
    summary:
      "Máncora is northern Peru's surf and kite town — consistent small waves year-round, reliable kite wind May through September. The town is compact and walkable; the better accommodation is north of the center on the beach road. Wifi in most guesthouses is unreliable — remote workers default to cafés on the main street or mobile data.",
    activity: "kite",
    bestMonths: "May – Sep (kite), year-round (surf)",
  },

  // ── South America: Brazil ─────────────────────────────────────────────────

  "florianopolis": {
    summary:
      "Florianópolis divides sharply by beach side: the north (Jurerê, Canasvieiras) is calmer and family-oriented; the east and south (Praia Mole, Lagoa da Conceição) are the surf and long-stay side. Lagoa da Conceição is the functional work hub — most coworkings and longer-term rentals concentrate there. The island is large, so choosing the wrong side means 40+ minute commutes.",
    activity: "surf",
    bestMonths: "Dec – Mar (summer) for surf, year-round for work",
  },

  "bonito": {
    summary:
      "Bonito's rivers are the product — Sucuri, Prata, and Olho d'Água have visibility rarely seen outside a swimming pool, and the snorkel drift is the primary experience. It's not a work base: accommodation is spread across rural hotels with uneven wifi, and the town center is minimal. Budget 4–6 days and book river tours in advance — daily quotas apply.",
    activity: "dive",
    bestMonths: "Apr – Oct (dry, clearest water)",
  },

  "fernando-de-noronha": {
    summary:
      "Fernando de Noronha is the remote UNESCO archipelago off Brazil's northeast — strong diving and snorkeling with visitor quotas and a mandatory environmental fee. Infrastructure is basic by design: no mass tourism, limited spots. It's a 4–7 day destination; fly from Recife or Natal and book dive tours months ahead.",
    activity: "dive",
    bestMonths: "Sep – Mar (calm seas, best visibility)",
  },

  "arraial-do-cabo": {
    summary:
      "Arraial do Cabo sits on the Cabo Frio coast, 2.5 hours from Rio — close enough for a long weekend, with dive visibility unusual for the Brazilian coast due to cold upwelling currents. The main diving is in Gruta Azul and around Ilha do Farol. It's not a nomad base: accommodation is basic, wifi is limited, and most people treat it as a 3–4 day extension from Rio.",
    activity: "dive",
    bestMonths: "May – Nov (best visibility)",
  },

  // ── Ecuador ───────────────────────────────────────────────────────────────

  "galapagos": {
    summary:
      "Puerto Ayora on Santa Cruz is the main logistics base for Galápagos diving. Live-aboard boats depart from the main dock and reach sites like Wolf and Darwin — consistently ranked among the best shark aggregation dives in the world. Land-based diving is possible but limited; the world-class sites require a live-aboard. Book and budget both well in advance.",
    activity: "dive",
    bestMonths: "Jun – Nov (hammerheads), Dec – May (mantas, whale sharks)",
  },

  // ── Brazil — Surf ─────────────────────────────────────────────────────────

  "jericoacoara": {
    summary:
      "Jericoacoara is the northeast Brazil kitesurfing and windsurf hub — strong consistent trade winds June through January, plus a sunset dune walk that's become a ritual. The access road is sand and requires a 4x4; this filters the crowd and keeps the village feel intact. Work options are limited to a few cafés in the village with unreliable power during wind season; budget at least 2 weeks to make the logistics worth it.",
    activity: "kite",
    bestMonths: "Jul – Jan (trade winds strongest)",
  },

  "itacare": {
    summary:
      "Itacaré sits on the Bahia coast between cocoa-farm trails and consistent beach breaks from Tiririca to Havaizinho — the full surf range from beach to point is within 15 minutes. Base in the town center on the main strip: most cafés and the better lunch spots are walkable, though wifi quality in the cafés is variable. It's compact enough to not need a moto-taxi for daily life, but transfers to breaks and the Ilhéus airport require transport.",
    activity: "surf",
    bestMonths: "Mar – Sep (best swell and offshore winds)",
  },

  "pipa": {
    summary:
      "Pipa is a cliff-top village above a series of coves on Rio Grande do Norte's coast — Praia do Amor, Baia dos Golfinhos, and Madeiro are all walkable. Surf quality depends on swell window but base conditions are more consistent than Natal. The village itself has real café infrastructure for a small town; expect reasonable work options on the main street. Access from Natal is 90 minutes on a paved road — reachable without a 4x4.",
    activity: "surf",
    bestMonths: "Jun – Jan (south swell, offshore winds)",
  },

  // ── Nicaragua ─────────────────────────────────────────────────────────────

  "san-juan-del-sur": {
    summary:
      "San Juan del Sur is a horseshoe bay town and the most practical surf base in southern Nicaragua — the center has cafés and restaurants, and you're 10–15 minutes from breaks like Playa Maderas and Playa Remanso. Wifi in town cafés is functional enough for remote work; the main street has multiple options. It's small and not overwhelmingly developed, which is the appeal — but services like a reliable pharmacy and a proper grocery require a specific errand.",
    activity: "surf",
    bestMonths: "Apr – Nov (south swell season)",
  },

  "popoyo": {
    summary:
      "Popoyo is Nicaragua's most consistent beach break and the clearest reason to base on the Tola coast — the main break is walkable from the cluster of hostels and small hotels near the point. Infrastructure is minimal by design: a few restaurants, one small shop, and limited coworking options. It works best as a 2–3 week dedicated surf base for someone who doesn't need daily work infrastructure — nearby Rivas or Managua are the fallback for anything else.",
    activity: "surf",
    bestMonths: "Apr – Nov (south swell)",
  },

  // ── El Salvador ───────────────────────────────────────────────────────────

  "el-zonte": {
    summary:
      "El Zonte is 15 minutes from El Tunco along the Litoral, and the contrast is sharp — quieter black-sand beach, smaller community feel, and a Bitcoin-economy experiment that's drawn a particular type of remote worker. The surf break is a step up in quality from El Tunco with less crowd. Work infrastructure is thin outside of a few beach cafés; base in El Zonte but day-trip to El Tunco for more options.",
    activity: "surf",
    bestMonths: "Apr – Oct (dry season, best swell)",
  },

  // ── Ecuador ───────────────────────────────────────────────────────────────

  "montanita": {
    summary:
      "Montañita splits into the beach surf zone and the 'pueblo' a block back — base in the pueblo if you're working; it's walkable to everything and away from the main beach noise. Surf-wise it's the primary wave on Ecuador's coast: consistent hollow beach break and a long left on the point during bigger swells. Coworking options are limited, but multiple cafés work well for sessions; the whole strip is walkable without transport.",
    activity: "surf",
    bestMonths: "Dec – Apr (largest swells, but more rain in Mar-Apr)",
  },

  "lobitos": {
    summary:
      "Lobitos is a Peruvian desert surf point — a long left that peels for 200+ meters on solid south swell, with almost nothing else nearby. The base is a cluster of hostels and houses around the point in what used to be an oil company town; infrastructure is sparse by any standard. It works for a focused surf stay of 1–2 weeks where you're prepared to self-cater; the nearest real town for groceries and pharmacies is Talara, 30 minutes north.",
    activity: "surf",
    bestMonths: "Apr – Oct (consistent south swell)",
  },

  // ── Panama ────────────────────────────────────────────────────────────────

  "playa-venao": {
    summary:
      "Playa Venao is Panama's best surf beach — a protected bay on the Azuero Peninsula with consistent beach break and a small cluster of accommodation around the point. Infrastructure has grown enough that a café with wifi and a basic grocery run are possible in the immediate area, but it's still compact. Base on or near the beach and factor in a vehicle for anything beyond daily basics; the nearest real services are in Pedasi, 15 minutes east.",
    activity: "surf",
    bestMonths: "Apr – Nov (south swell, dry conditions Apr-May)",
  },

  // ── Mexico — inland/culture ───────────────────────────────────────────────

  "bacalar": {
    summary:
      "Bacalar is built around the Lagoon of Seven Colors — a shallow freshwater lagoon that makes every afternoon light look like concept art. It's become a legitimate remote work base in southern Mexico: the main street (Calle 1) has multiple cafés with reliable wifi, and boat access to the lagoon is cheap and immediate. Grocery and pharmacy options exist in town; Chetumal is 90 minutes south for anything specific. It's not a surf base — it's a calm, functional base for someone who works mornings and wants the water in the afternoon.",
    bestMonths: "Nov – Apr (dry season, clearest water)",
  },

  // ── Guatemala ─────────────────────────────────────────────────────────────

  "lago-atitlan": {
    summary:
      "Lake Atitlán sits between three volcanoes at 1,560m — the geography is the draw, and the three main villages (San Pedro, San Marcos, Panajachel) each have a different character. San Pedro has the most developed remote work infrastructure: multiple cafés on the main street, a few coworking-adjacent spots, and the densest collection of restaurants. Boat taxis between villages take 20–40 minutes; factor this into your daily routine. Altitude can affect energy for the first 2–3 days.",
    activity: "hike",
    bestMonths: "Nov – Apr (dry season)",
  },

};
