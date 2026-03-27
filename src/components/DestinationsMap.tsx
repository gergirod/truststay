"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  DESTINATION_PINS,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
  type DestinationCategory,
} from "@/data/destinationCoords";

// ── Active filter state ────────────────────────────────────────────────────
const ALL_CATEGORIES: DestinationCategory[] = [
  "Surf",
  "Dive",
  "Hike",
  "Yoga & wellness",
  "Kite & wind",
  "Remote work hubs",
];

// ── Pin SVGs ───────────────────────────────────────────────────────────────
// pointer-events:none is critical — without it, mousing over a child SVG
// element fires mouseleave on the wrapper div, causing the hover to flicker
// and the scale to reset immediately ("pin goes away" effect).

// Activity destinations → teardrop pin (pointing down)
function activityPinSVG(color: string): string {
  return `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;display:block">
    <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 19 11 19S22 19.3 22 11C22 4.9 17.1 0 11 0z" fill="${color}"/>
    <circle cx="11" cy="10.5" r="4.5" fill="white" opacity="0.92"/>
  </svg>`;
}

// Work hubs → circle with outer ring (different visual language)
function hubPinSVG(color: string): string {
  return `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;display:block">
    <circle cx="13" cy="13" r="12" fill="${color}" stroke="white" stroke-width="2.5"/>
    <circle cx="13" cy="13" r="5.5" fill="white" opacity="0.92"/>
  </svg>`;
}

// ── Popup HTML ─────────────────────────────────────────────────────────────
function popupHTML(
  label: string,
  slug: string,
  category: DestinationCategory,
  color: string
): string {
  const emoji = CATEGORY_EMOJIS[category];
  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 10px 14px 12px;
      min-width: 160px;
      max-width: 200px;
    ">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: ${color};
        margin-bottom: 5px;
      ">
        <span>${emoji}</span>
        <span>${category}</span>
      </div>
      <div style="
        font-size: 15px;
        font-weight: 600;
        color: #2E2A26;
        line-height: 1.2;
        margin-bottom: 8px;
      ">${label}</div>
      <a
        href="/city/${slug}"
        style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: white;
          background: ${color};
          padding: 4px 10px;
          border-radius: 20px;
          text-decoration: none;
        "
      >Explore →</a>
    </div>`;
}

// ── Component ──────────────────────────────────────────────────────────────

export function DestinationsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [activeCategory, setActiveCategory] = useState<DestinationCategory | "All">("All");

  // Expose a ref to marker elements so we can show/hide on filter change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<{ pin: DestinationCategory; el: HTMLElement; marker: any }[]>([]);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    let cancelled = false;

    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token!;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        // Center on Latin America
        center: [-75, -10],
        zoom: 2.4,
        minZoom: 1.5,
        maxZoom: 10,
        attributionControl: false,
      });

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!map) return;

        for (const pin of DESTINATION_PINS) {
          const isHub = pin.category === "Remote work hubs";
          const color = CATEGORY_COLORS[pin.category];

          const el = document.createElement("div");
          el.style.cursor = "pointer";
          el.style.transition = "transform 0.15s ease, opacity 0.15s ease";
          el.style.width = isHub ? "26px" : "22px";
          el.style.height = isHub ? "26px" : "30px";
          // transform-origin at bottom for teardrops so the tip stays anchored
          el.style.transformOrigin = isHub ? "center center" : "center bottom";
          el.innerHTML = isHub ? hubPinSVG(color) : activityPinSVG(color);

          // Hover scale — zIndex must go on the Mapbox wrapper (.mapboxgl-marker),
          // not on el itself, because the wrapper is the positioned ancestor.
          el.addEventListener("mouseenter", () => {
            el.style.transform = "scale(1.3)";
            if (el.parentElement) el.parentElement.style.zIndex = "100";
          });
          el.addEventListener("mouseleave", () => {
            el.style.transform = "scale(1)";
            if (el.parentElement) el.parentElement.style.zIndex = "";
          });

          const popup = new mapboxgl.Popup({
            offset: isHub ? 16 : 28,
            closeButton: false,
            maxWidth: "220px",
            className: "truststay-popup",
          }).setHTML(popupHTML(pin.label, pin.slug, pin.category, color));

          const marker = new mapboxgl.Marker({ element: el, anchor: isHub ? "center" : "bottom" })
            .setLngLat([pin.lon, pin.lat])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("click", () => {
            marker.togglePopup();
          });

          markersRef.current.push({ pin: pin.category, el, marker });
        }
      });
    }

    init().catch(console.warn);

    return () => {
      cancelled = true;
      markersRef.current = [];
      map?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Filter visibility whenever activeCategory changes ───────────────────
  useEffect(() => {
    for (const { pin, el } of markersRef.current) {
      const visible = activeCategory === "All" || pin === activeCategory;
      el.style.opacity = visible ? "1" : "0";
      el.style.pointerEvents = visible ? "auto" : "none";
    }
  }, [activeCategory]);

  if (!token) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-dune shadow-sm" style={{ height: "520px" }}>
      {/* Map canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Category filter pills — float top-left */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 max-w-[calc(100%-80px)]">
        <FilterPill
          label="All"
          color="#2E2A26"
          active={activeCategory === "All"}
          onClick={() => setActiveCategory("All")}
        />
        {ALL_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            label={`${CATEGORY_EMOJIS[cat]} ${cat}`}
            color={CATEGORY_COLORS[cat]}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(activeCategory === cat ? "All" : cat)}
          />
        ))}
      </div>

      {/* Pin legend — bottom left */}
      <div className="absolute bottom-7 left-3 z-10 flex items-center gap-4 rounded-xl border border-dune bg-white/92 backdrop-blur-sm px-3 py-2 pointer-events-none">
        <div className="flex items-center gap-1.5">
          {/* Teardrop icon */}
          <svg width="11" height="15" viewBox="0 0 22 30" className="flex-shrink-0">
            <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 19 11 19S22 19.3 22 11C22 4.9 17.1 0 11 0z" fill="#E07A5F"/>
            <circle cx="11" cy="10.5" r="4.5" fill="white" opacity="0.92"/>
          </svg>
          <span className="text-[10px] text-umber leading-none">Activity spot</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Circle icon */}
          <svg width="13" height="13" viewBox="0 0 26 26" className="flex-shrink-0">
            <circle cx="13" cy="13" r="12" fill="#8FB7B3" stroke="white" strokeWidth="2.5"/>
            <circle cx="13" cy="13" r="5.5" fill="white" opacity="0.92"/>
          </svg>
          <span className="text-[10px] text-umber leading-none">Work hub</span>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all leading-none"
      style={{
        background: active ? color : "rgba(255,255,255,0.92)",
        borderColor: active ? color : "#E8E3DC",
        color: active ? "white" : "#5F5A54",
        boxShadow: active ? `0 1px 6px ${color}55` : "none",
      }}
    >
      {label}
    </button>
  );
}
