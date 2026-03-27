"use client";

import { useState } from "react";
import { DestinationPill } from "@/components/DestinationPill";

type Region = "All" | "Mexico" | "Central America" | "Caribbean" | "South America";

const REGIONS: { label: Region; flag: string }[] = [
  { label: "All",             flag: "🌎" },
  { label: "Mexico",          flag: "🇲🇽" },
  { label: "Central America", flag: "🌴" },
  { label: "Caribbean",       flag: "🏝️" },
  { label: "South America",   flag: "🌿" },
];

// Slug → region. Belize & Honduras Bay Islands are Caribbean-coast.
const SLUG_REGION: Record<string, Region> = {
  // ── Mexico ──────────────────────────────────────────────────────────────
  "puerto-escondido": "Mexico", "sayulita": "Mexico", "troncones": "Mexico",
  "todos-santos": "Mexico", "mazunte": "Mexico", "tulum": "Mexico",
  "cozumel": "Mexico", "isla-mujeres": "Mexico", "playa-del-carmen": "Mexico",
  "mahahual": "Mexico", "huatulco": "Mexico", "la-paz": "Mexico",
  "oaxaca": "Mexico", "san-cristobal-de-las-casas": "Mexico",
  "guanajuato": "Mexico", "merida": "Mexico", "mexico-city": "Mexico",
  "guadalajara": "Mexico", "puerto-vallarta": "Mexico",
  "la-ventana": "Mexico", "los-barriles": "Mexico",
  "tepoztlan": "Mexico", "bacalar": "Mexico",

  // ── Central America ──────────────────────────────────────────────────────
  "el-tunco": "Central America", "el-zonte": "Central America",
  "popoyo": "Central America", "gigante": "Central America",
  "san-juan-del-sur": "Central America", "el-paredon": "Central America",
  "santa-teresa": "Central America", "nosara": "Central America",
  "tamarindo": "Central America", "dominical": "Central America",
  "jaco": "Central America", "pavones": "Central America",
  "santa-catalina": "Central America", "playa-venao": "Central America",
  "antigua-guatemala": "Central America", "lago-atitlan": "Central America",
  "san-marcos-la-laguna": "Central America", "san-pedro-la-laguna": "Central America",
  "panajachel": "Central America", "quetzaltenango": "Central America",
  "acatenango": "Central America", "copan-ruinas": "Central America",
  "ometepe": "Central America", "leon": "Central America",
  "granada": "Central America", "bocas-del-toro": "Central America",
  "boquete": "Central America", "el-valle-de-anton": "Central America",
  "monteverde": "Central America", "arenal": "Central America",
  "montezuma": "Central America", "puerto-viejo": "Central America",
  "uvita": "Central America", "coiba": "Central America",
  "cahuita": "Central America", "pedasi": "Central America",
  "panama-city": "Central America", "san-jose-costa-rica": "Central America",

  // ── Caribbean (incl. Belize + Honduras Bay Islands) ─────────────────────
  "caye-caulker": "Caribbean", "san-pedro-belize": "Caribbean",
  "placencia": "Caribbean", "roatan": "Caribbean", "utila": "Caribbean",
  "cabarete": "Caribbean", "las-terrenas": "Caribbean", "bayahibe": "Caribbean",
  "san-andres": "Caribbean", "providencia": "Caribbean", "taganga": "Caribbean",
  "bonaire": "Caribbean", "curacao": "Caribbean", "aruba": "Caribbean",
  "dominica": "Caribbean", "martinique": "Caribbean",
  "guadeloupe": "Caribbean", "barbados": "Caribbean",
  "rincon": "Caribbean", "san-juan-puerto-rico": "Caribbean",

  // ── South America ────────────────────────────────────────────────────────
  "montanita": "South America", "olon": "South America", "canoa": "South America",
  "ayampe": "South America", "mancora": "South America", "lobitos": "South America",
  "chicama": "South America", "huanchaco": "South America",
  "jericoacoara": "South America", "itacare": "South America",
  "pipa": "South America", "arraial-do-cabo": "South America",
  "praia-do-rosa": "South America", "punta-del-diablo": "South America",
  "pichilemu": "South America", "minca": "South America",
  "palomino": "South America", "santa-marta": "South America",
  "cartagena": "South America", "villa-de-leyva": "South America",
  "salento": "South America", "cabo-de-la-vela": "South America",
  "cali": "South America", "medellin": "South America", "bogota": "South America",
  "banos": "South America", "quilotoa": "South America",
  "vilcabamba": "South America", "mindo": "South America", "cuenca": "South America",
  "quito": "South America", "lima": "South America", "cusco": "South America",
  "huaraz": "South America", "ollantaytambo": "South America", "pisac": "South America",
  "arequipa": "South America", "sucre": "South America",
  "la-paz-bolivia": "South America", "coroico": "South America",
  "bariloche": "South America", "mendoza": "South America", "salta": "South America",
  "el-chalten": "South America", "jujuy": "South America",
  // Argentina — NW highlands
  "tilcara": "South America", "purmamarca": "South America", "humahuaca": "South America",
  "iruya": "South America", "cafayate": "South America",
  // Argentina — Mendoza Andes
  "uspallata": "South America", "potrerillos": "South America",
  // Argentina — Patagonia additions
  "el-bolson": "South America", "san-martin-de-los-andes": "South America",
  "villa-la-angostura": "South America", "esquel": "South America",
  // Chile — hike additions
  "cajon-del-maipo": "South America", "cochamo": "South America",
  "futaleufu": "South America", "conguillo": "South America",
  // Chile — Easter Island
  "hanga-roa": "South America",
  // Argentina — Patagonia coast dive
  "puerto-madryn": "South America", "ushuaia": "South America",
  // Ecuador — Galápagos
  "galapagos": "South America",
  // Colombia — Pacific dive
  "nuqui": "South America",
  // Venezuela
  "los-roques": "South America",
  // Brazil — dive
  "fernando-de-noronha": "South America", "abrolhos": "South America",
  "florianopolis": "South America", "bonito": "South America",
  "lencois": "South America", "paraty": "South America",
  "trancoso": "South America", "alto-paraiso": "South America",
  "sao-paulo": "South America", "rio-de-janeiro": "South America",
  "buenos-aires": "South America", "montevideo": "South America",
  "cordoba": "South America", "rosario": "South America",
  "santiago": "South America", "valparaiso": "South America",
  "asuncion": "South America", "pucon": "South America",
  "san-pedro-de-atacama": "South America", "puerto-natales": "South America",
  "iquique": "South America", "la-paloma": "South America",
  "punta-del-este": "South America", "cumbuco": "South America",
  "prea": "South America", "atins": "South America",
  "canoa-quebrada": "South America", "sao-miguel-do-gostoso": "South America",
  "paracas": "South America", "fortaleza": "South America",
  "chachapoyas": "South America", "sorata": "South America",
  "rurrenabaque": "South America", "recife": "South America",
  "salvador": "South America", "porto-alegre": "South America",
  "curitiba": "South America",
};

interface Destination {
  label: string;
  slug: string;
}

interface Category {
  label: string;
  destinations: Destination[];
}

interface CategoryMeta {
  icon: string;
  description: string;
}

interface Props {
  categories: Category[];
  categoryMeta: Record<string, CategoryMeta>;
}

export function DestinationBrowse({ categories, categoryMeta }: Props) {
  const [region, setRegion] = useState<Region>("All");

  const filtered = categories
    .map((cat) => ({
      ...cat,
      destinations: cat.destinations.filter(
        (d) => region === "All" || SLUG_REGION[d.slug] === region
      ),
    }))
    .filter((cat) => cat.destinations.length > 0);

  return (
    <div>
      {/* Region filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {REGIONS.map(({ label, flag }) => {
          const active = region === label;
          return (
            <button
              key={label}
              onClick={() => setRegion(label)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all"
              style={{
                background: active ? "#2E2A26" : "white",
                borderColor: active ? "#2E2A26" : "#E8E3DC",
                color: active ? "white" : "#5F5A54",
              }}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Category rows */}
      <div className="mt-8 space-y-10">
        {filtered.map((cat) => {
          const meta = categoryMeta[cat.label];
          return (
            <div key={cat.label}>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-lg leading-none">{meta?.icon}</span>
                <div>
                  <span className="text-sm font-semibold text-bark">{cat.label}</span>
                  {meta?.description && (
                    <span className="ml-2 text-xs text-umber/50">{meta.description}</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {cat.destinations.map(({ label, slug }) => (
                    <DestinationPill
                      key={slug}
                      slug={slug}
                      label={label}
                      category={cat.label}
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-sand to-transparent sm:hidden" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
