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
// Coordinates around Bairro Alto / Príncipe Real — the real work cluster.

const DEMO_BASE = { lat: 38.7115, lon: -9.1433 };

const DEMO_PINS: { lat: number; lon: number; category: string }[] = [
  { lat: 38.7161, lon: -9.1503, category: "work" },      // Príncipe Real
  { lat: 38.7107, lon: -9.1391, category: "work" },      // Chiado
  { lat: 38.7157, lon: -9.1400, category: "coffee" },    // Chiado area
  { lat: 38.7199, lon: -9.1354, category: "coffee" },    // Intendente
  { lat: 38.7139, lon: -9.1543, category: "wellbeing" }, // Rato
  { lat: 38.7073, lon: -9.1516, category: "locked" },    // Santos
  { lat: 38.7177, lon: -9.1333, category: "locked" },    // Mouraria
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
        zoom: 13.2,
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

        // Fit to show all pins
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([DEMO_BASE.lon, DEMO_BASE.lat]);
        DEMO_PINS.forEach((p) => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
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
