"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import {
  MAP_COLORS,
  createBaseMarker,
  createPlaceMarker,
  createLockedMarker,
} from "@/lib/mapMarkers";

// ── Hardcoded Lisbon demo data ─────────────────────────────────────────────
// Dense cluster around Bairro Alto / Príncipe Real / Chiado.

const DEMO_BASE = { lat: 38.7125, lon: -9.1440 };

const DEMO_PINS: { lat: number; lon: number; category: string }[] = [
  // Work spots (teal laptop)
  { lat: 38.7161, lon: -9.1503, category: "work" },   // Príncipe Real
  { lat: 38.7107, lon: -9.1391, category: "work" },   // Chiado
  { lat: 38.7142, lon: -9.1468, category: "work" },   // Bairro Alto
  { lat: 38.7085, lon: -9.1425, category: "work" },   // Cais do Sodré
  // Coffee & meals (terracotta cup)
  { lat: 38.7157, lon: -9.1410, category: "coffee" }, // Chiado area
  { lat: 38.7098, lon: -9.1355, category: "coffee" }, // Baixa
  { lat: 38.7178, lon: -9.1470, category: "coffee" }, // Príncipe Real
  { lat: 38.7065, lon: -9.1470, category: "coffee" }, // Cais do Sodré
  // Wellbeing (amber figure)
  { lat: 38.7148, lon: -9.1533, category: "wellbeing" }, // Rato
  { lat: 38.7090, lon: -9.1500, category: "wellbeing" }, // Santos
  // Locked grey dots
  { lat: 38.7120, lon: -9.1360, category: "locked" },
  { lat: 38.7050, lon: -9.1410, category: "locked" },
  { lat: 38.7188, lon: -9.1390, category: "locked" },
  { lat: 38.7132, lon: -9.1560, category: "locked" },
];

export function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    let cancelled = false;

    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      // Skip if container is hidden (display:none gives 0 width)
      if (containerRef.current.getBoundingClientRect().width === 0) return;

      mapboxgl.accessToken = token!;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [DEMO_BASE.lon, DEMO_BASE.lat],
        zoom: 14.2,           // tight zoom — pins fill the frame
        interactive: false,   // hero preview — no pan / zoom
        attributionControl: false,
      });

      // Attribution required by Mapbox ToS — compact, bottom-right
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      map.on("load", () => {
        if (!map) return;

        // Base area marker
        const baseEl = createBaseMarker();
        baseEl.style.cursor = "default";
        new mapboxgl.Marker({ element: baseEl })
          .setLngLat([DEMO_BASE.lon, DEMO_BASE.lat])
          .addTo(map);

        // Place markers
        for (const pin of DEMO_PINS) {
          const el =
            pin.category === "locked"
              ? createLockedMarker()
              : createPlaceMarker(pin.category);

          // non-interactive — remove pointer cursor from locked dots
          el.style.cursor = "default";

          new mapboxgl.Marker({ element: el })
            .setLngLat([pin.lon, pin.lat])
            .addTo(map);
        }

        // Fixed center + zoom — more predictable than fitBounds for a hero
      });
    }

    init().catch(console.warn);

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [token]);

  if (!token) return null;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* City label — top left */}
      <div className="absolute top-4 left-4 rounded-lg border border-dune bg-white/90 backdrop-blur-sm px-3 py-1.5 pointer-events-none">
        <p className="text-[10px] font-semibold text-bark leading-none">Lisbon</p>
        <p className="mt-0.5 text-[9px] text-umber leading-none">live example</p>
      </div>

      {/* Category legend — bottom left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2 pointer-events-none">
        <LegendDot color={MAP_COLORS.work} label="Work" />
        <LegendDot color={MAP_COLORS.coffee} label="Coffee & meals" />
        <LegendDot color={MAP_COLORS.wellbeing} label="Wellbeing" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: color }}
      />
      <span className="text-[10px] leading-none text-umber">{label}</span>
    </div>
  );
}
