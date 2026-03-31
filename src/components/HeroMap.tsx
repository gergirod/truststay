"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import {
  MAP_COLORS,
  createBaseMarker,
  createPlaceMarker,
  createLockedMarker,
} from "@/lib/mapMarkers";

// ── Hardcoded Puerto Escondido demo data ───────────────────────────────────
// Tight cluster around Puerto Escondido center (land-heavy, less ocean bleed).

const DEMO_BASE = { lat: 15.8639, lon: -97.0729 };
const DEMO_CENTER = { lat: 15.8648, lon: -97.0706 };

const DEMO_PINS: { lat: number; lon: number; category: string }[] = [
  // Work spots — teal laptop
  { lat: 15.8662, lon: -97.0752, category: "work" },
  { lat: 15.8619, lon: -97.0698, category: "work" },
  { lat: 15.8651, lon: -97.0717, category: "work" },
  { lat: 15.8628, lon: -97.0668, category: "work" },
  { lat: 15.8670, lon: -97.0689, category: "work" },
  // Coffee & meals — terracotta cup
  { lat: 15.8658, lon: -97.0675, category: "coffee" },
  { lat: 15.8681, lon: -97.0737, category: "coffee" },
  { lat: 15.8621, lon: -97.0759, category: "coffee" },
  { lat: 15.8611, lon: -97.0702, category: "coffee" },
  { lat: 15.8644, lon: -97.0658, category: "coffee" },
  { lat: 15.8669, lon: -97.0710, category: "coffee" },
  // Wellbeing — amber figure
  { lat: 15.8686, lon: -97.0699, category: "wellbeing" },
  { lat: 15.8608, lon: -97.0736, category: "wellbeing" },
  { lat: 15.8630, lon: -97.0670, category: "wellbeing" },
  // Locked — grey dots
  { lat: 15.8640, lon: -97.0645, category: "locked" },
  { lat: 15.8601, lon: -97.0714, category: "locked" },
  { lat: 15.8674, lon: -97.0663, category: "locked" },
  { lat: 15.8617, lon: -97.0748, category: "locked" },
  { lat: 15.8680, lon: -97.0719, category: "locked" },
  { lat: 15.8636, lon: -97.0691, category: "locked" },
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
        center: [DEMO_CENTER.lon, DEMO_CENTER.lat],
        zoom: 15.8,
        minZoom: 15.5,        // keep it tight so markers stay visible around card
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

        // Force zoom in case initial render drifted
        map.jumpTo({ center: [DEMO_CENTER.lon, DEMO_CENTER.lat], zoom: 15.8 });

        // Base area marker
        const baseEl = createBaseMarker();
        baseEl.style.cursor = "default";
        new mapboxgl.Marker({ element: baseEl, anchor: "bottom" })
          .setLngLat([DEMO_BASE.lon, DEMO_BASE.lat])
          .addTo(map);

        // Place markers
        for (const pin of DEMO_PINS) {
          const isLocked = pin.category === "locked";
          const el = isLocked
            ? createLockedMarker()
            : createPlaceMarker(pin.category);

          el.style.cursor = "default";

          new mapboxgl.Marker({
            element: el,
            anchor: isLocked ? "center" : "bottom",
          })
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
        <p className="text-[10px] font-semibold text-bark leading-none">Puerto Escondido</p>
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
