"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import {
  MAP_COLORS,
  createBaseMarker,
  createPlaceMarker,
  createLockedMarker,
} from "@/lib/mapMarkers";

// ── Hardcoded Santa Teresa demo data ───────────────────────────────────────
// Tight cluster around Santa Teresa, Costa Rica.

const DEMO_BASE = { lat: 9.6437, lon: -85.1686 };

const DEMO_PINS: { lat: number; lon: number; category: string }[] = [
  // Work spots — teal laptop
  { lat: 9.6463, lon: -85.1722, category: "work" },
  { lat: 9.6418, lon: -85.1651, category: "work" },
  { lat: 9.6449, lon: -85.1694, category: "work" },
  { lat: 9.6409, lon: -85.1710, category: "work" },
  { lat: 9.6481, lon: -85.1665, category: "work" },
  // Coffee & meals — terracotta cup
  { lat: 9.6458, lon: -85.1659, category: "coffee" },
  { lat: 9.6475, lon: -85.1703, category: "coffee" },
  { lat: 9.6420, lon: -85.1733, category: "coffee" },
  { lat: 9.6412, lon: -85.1640, category: "coffee" },
  { lat: 9.6396, lon: -85.1680, category: "coffee" },
  { lat: 9.6441, lon: -85.1751, category: "coffee" },
  // Wellbeing — amber figure
  { lat: 9.6468, lon: -85.1760, category: "wellbeing" },
  { lat: 9.6398, lon: -85.1741, category: "wellbeing" },
  { lat: 9.6429, lon: -85.1672, category: "wellbeing" },
  // Locked — grey dots
  { lat: 9.6435, lon: -85.1618, category: "locked" },
  { lat: 9.6378, lon: -85.1692, category: "locked" },
  { lat: 9.6486, lon: -85.1637, category: "locked" },
  { lat: 9.6387, lon: -85.1729, category: "locked" },
  { lat: 9.6452, lon: -85.1783, category: "locked" },
  { lat: 9.6416, lon: -85.1660, category: "locked" },
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
        zoom: 15,
        minZoom: 14.5,        // prevent any drift toward wider view
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
        map.jumpTo({ center: [DEMO_BASE.lon, DEMO_BASE.lat], zoom: 15 });

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
        <p className="text-[10px] font-semibold text-bark leading-none">Santa Teresa</p>
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
