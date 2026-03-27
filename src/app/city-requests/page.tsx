import type { Metadata } from "next";
import Link from "next/link";
import { CityRequestsClient } from "./CityRequestsClient";
import type { CityRequest } from "./CityRequestsClient";

export const metadata: Metadata = {
  title: "Cities you're asking for — Truststay",
  description:
    "Vote for the destinations you want added to Truststay's remote worker neighborhood guide. We add new cities based on demand.",
};

type Props = {
  searchParams: Promise<{ city?: string }>;
};

/**
 * Seed cities — requested destinations not yet in Truststay.
 * Votes are the initial signal count; users add on top via voting.
 * Mix of: popular LATAM gaps + global expansion requests.
 */
const SEED_REQUESTS: CityRequest[] = [
  // Beyond LATAM — most requested global expansion
  { slug: "bali",              name: "Bali",             country: "Indonesia",     region: "Beyond LATAM", votes: 124 },
  { slug: "chiang-mai",        name: "Chiang Mai",       country: "Thailand",      region: "Beyond LATAM", votes: 98  },
  { slug: "lisbon",            name: "Lisbon",           country: "Portugal",      region: "Beyond LATAM", votes: 87  },
  { slug: "ho-chi-minh-city",  name: "Ho Chi Minh City", country: "Vietnam",       region: "Beyond LATAM", votes: 71  },
  { slug: "tbilisi",           name: "Tbilisi",          country: "Georgia",       region: "Beyond LATAM", votes: 68  },
  { slug: "split",             name: "Split",            country: "Croatia",       region: "Beyond LATAM", votes: 55  },
  { slug: "da-nang",           name: "Da Nang",          country: "Vietnam",       region: "Beyond LATAM", votes: 51  },
  { slug: "porto",             name: "Porto",            country: "Portugal",      region: "Beyond LATAM", votes: 49  },
  { slug: "cape-town",         name: "Cape Town",        country: "South Africa",  region: "Beyond LATAM", votes: 46  },
  { slug: "las-palmas",        name: "Las Palmas",       country: "Spain",         region: "Beyond LATAM", votes: 41  },
  { slug: "madeira",           name: "Madeira",          country: "Portugal",      region: "Beyond LATAM", votes: 37  },
  { slug: "budapest",          name: "Budapest",         country: "Hungary",       region: "Beyond LATAM", votes: 33  },
  { slug: "kotor",             name: "Kotor",            country: "Montenegro",    region: "Beyond LATAM", votes: 28  },
  // Mexico — gaps
  { slug: "holbox",            name: "Holbox",           country: "Mexico",        region: "Mexico",       votes: 44  },
  { slug: "zihuatanejo",       name: "Zihuatanejo",      country: "Mexico",        region: "Mexico",       votes: 31  },
  { slug: "la-paz-baja",       name: "La Paz",           country: "Mexico (Baja)", region: "Mexico",       votes: 27  },
  { slug: "san-jose-del-cabo", name: "San José del Cabo",country: "Mexico",        region: "Mexico",       votes: 22  },
  { slug: "punta-mita",        name: "Punta Mita",       country: "Mexico",        region: "Mexico",       votes: 18  },
  // Central America — gaps
  { slug: "san-juan-del-sur-nicaragua", name: "San Juan del Sur", country: "Nicaragua", region: "Central America", votes: 19 },
  // South America — gaps
  { slug: "san-gil",           name: "San Gil",          country: "Colombia",      region: "South America", votes: 35 },
  { slug: "jardin",            name: "Jardín",           country: "Colombia",      region: "South America", votes: 29 },
  { slug: "gramado",           name: "Gramado",          country: "Brazil",        region: "South America", votes: 21 },
  { slug: "porto-de-galinhas", name: "Porto de Galinhas",country: "Brazil",        region: "South America", votes: 19 },
  { slug: "la-serena",         name: "La Serena",        country: "Chile",         region: "South America", votes: 16 },
  { slug: "chapada-diamantina",name: "Chapada Diamantina",country: "Brazil",       region: "South America", votes: 14 },
  { slug: "natal-brazil",      name: "Natal",            country: "Brazil",        region: "South America", votes: 13 },
  // Caribbean — gaps
  { slug: "saint-lucia",       name: "Saint Lucia",      country: "Caribbean",     region: "Caribbean",    votes: 24  },
  { slug: "turks-caicos",      name: "Turks & Caicos",   country: "Caribbean",     region: "Caribbean",    votes: 18  },
];

export default async function CityRequestsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const highlightSlug = typeof sp.city === "string" ? sp.city : undefined;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="border-b border-dune bg-cream">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-sm text-umber hover:text-bark transition-colors">
            ← Back
          </Link>
          <div className="h-4 w-px bg-dune" />
          <span className="text-base font-semibold tracking-tight text-bark">Truststay</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Page title */}
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
            City requests
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bark sm:text-4xl">
            Cities you&rsquo;re asking for
          </h1>
          <p className="mt-3 text-base leading-7 text-umber">
            We add new destinations based on demand. Vote for the ones you need — the most-voted get prioritized.
          </p>
        </div>

        <CityRequestsClient seed={SEED_REQUESTS} highlightSlug={highlightSlug} />
      </main>

      <footer className="border-t border-dune bg-white mt-16">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-sm text-umber">
            Truststay — built for remote workers who need to get functional fast.
          </p>
        </div>
      </footer>
    </div>
  );
}
