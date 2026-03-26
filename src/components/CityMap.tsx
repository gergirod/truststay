"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { Place } from "@/types";

interface CityMapProps {
  places: Place[];
  baseLat?: number;
  baseLon?: number;
  isUnlocked: boolean;
  /** IDs of places shown as full cards in the free tier */
  freePlaceIds: string[];
  cityName: string;
}

// ── Inline SVG icons (14×14 viewport) ─────────────────────────────────────

const ICON_WORK = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="white" stroke-width="1.5"/>
  <path d="M0 12h14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const ICON_COFFEE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 5h8v5a3 3 0 01-3 3H5a3 3 0 01-3-3V5z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10 6h1a1.5 1.5 0 010 3h-1" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M4 3c0-1 1.5-1 1.5-2M7.5 3c0-1 1.5-1 1.5-2" stroke="white" stroke-width="1" stroke-linecap="round"/>
</svg>`;

// Stick figure with arms raised — works for gym, yoga, sports
const ICON_WELLBEING = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="7" cy="2.5" r="1.5" fill="white"/>
  <line x1="7" y1="4" x2="7" y2="9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="4" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="10" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="5" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="9" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const ICON_BASE = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 1l1.6 3.3L14 5.1l-3 2.9.7 4.1L8 10.4l-3.7 1.7.7-4.1L2 5.1l4.4-.8L8 1z" fill="white"/>
</svg>`;

// ── Colors aligned with Truststay palette ─────────────────────────────────

const COLOR = {
  work: "#8FB7B3",       // teal — same as --color-teal in globals.css
  coffee: "#C07A58",     // warm terracotta for coffee/meals
  wellbeing: "#B99B6B",  // warm amber for gyms / yoga / sports
  base: "#2E2A26",       // bark — darkest brand colour
  locked: "#C8C3BC",     // dune — muted neutral
} as const;

// ── Marker factory functions ───────────────────────────────────────────────

function createBaseMarker(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "40px",
    height: "40px",
    background: COLOR.base,
    borderRadius: "50%",
    border: "3px solid white",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
  });
  el.innerHTML = ICON_BASE;
  return el;
}

function createPlaceMarker(category: string): HTMLElement {
  const color =
    category === "coworking" ? COLOR.work :
    category === "cafe"      ? COLOR.work :
    category === "food"      ? COLOR.coffee :
    category === "gym"       ? COLOR.wellbeing :
    COLOR.work;

  const icon =
    category === "food"      ? ICON_COFFEE :
    category === "gym"       ? ICON_WELLBEING :
    ICON_WORK;

  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "30px",
    height: "30px",
    background: color,
    borderRadius: "50%",
    border: "2.5px solid white",
    boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  });
  el.innerHTML = icon;
  return el;
}

function createLockedMarker(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "12px",
    height: "12px",
    background: COLOR.locked,
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    cursor: "pointer",
  });
  return el;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CityMap({
  places,
  baseLat,
  baseLon,
  isUnlocked,
  freePlaceIds,
  cityName,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const freeSet = new Set(freePlaceIds);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    const hasAnyPoint =
      (baseLat !== undefined && baseLon !== undefined) || places.length > 0;
    if (!hasAnyPoint) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    let cancelled = false;

    async function init() {
      // Dynamic import avoids SSR window-reference errors
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token!;

      const centerLon = baseLon ?? places[0]?.lon ?? 0;
      const centerLat = baseLat ?? places[0]?.lat ?? 0;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [centerLon, centerLat],
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );

      map.on("load", () => {
        if (!map) return;
        const bounds = new mapboxgl.LngLatBounds();
        let pointCount = 0;

        // ── Base area marker ───────────────────────────────────────────
        if (baseLat !== undefined && baseLon !== undefined) {
          const el = createBaseMarker();
          const popup = new mapboxgl.Popup({
            offset: 24,
            closeButton: false,
            className: "ts-popup",
          }).setHTML(
            `<p style="margin:0;font-size:12px;font-weight:600;color:#2E2A26;white-space:nowrap">Suggested base — ${cityName}</p>`
          );
          new mapboxgl.Marker({ element: el })
            .setLngLat([baseLon, baseLat])
            .setPopup(popup)
            .addTo(map!);
          bounds.extend([baseLon, baseLat]);
          pointCount++;
        }

        // ── Place markers ──────────────────────────────────────────────
        for (const place of places) {
          const showDetail = isUnlocked || freeSet.has(place.id);
          const el = showDetail
            ? createPlaceMarker(place.category)
            : createLockedMarker();

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([place.lon, place.lat])
            .addTo(map!);

          if (showDetail) {
            const ratingStr =
              place.google?.rating != null
                ? ` · ★ ${place.google.rating}`
                : "";
            const popup = new mapboxgl.Popup({
              offset: 20,
              closeButton: false,
              className: "ts-popup",
            }).setHTML(
              `<p style="margin:0;font-size:12px;font-weight:600;color:#2E2A26">${place.name}</p>
               <p style="margin:2px 0 0;font-size:11px;color:#5F5A54;text-transform:capitalize">${place.category}${ratingStr}</p>`
            );
            marker.setPopup(popup);

            el.addEventListener("click", () => {
              document
                .getElementById(`place-${place.id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          } else {
            const popup = new mapboxgl.Popup({
              offset: 16,
              closeButton: false,
              className: "ts-popup",
            }).setHTML(
              `<p style="margin:0;font-size:11px;color:#5F5A54">Unlock to see this place</p>`
            );
            marker.setPopup(popup);
          }

          bounds.extend([place.lon, place.lat]);
          pointCount++;
        }

        // ── Fit map to all points ──────────────────────────────────────
        if (pointCount > 1) {
          map!.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });
        }
      });
    }

    init().catch(console.warn);

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, baseLat, baseLon, isUnlocked]);

  if (!token) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-dune">
      <div ref={containerRef} className="w-full" style={{ height: "280px" }} />

      {/* Category legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2">
        <LegendDot color={COLOR.work} label="Work" />
        <LegendDot color={COLOR.coffee} label="Coffee & meals" />
        <LegendDot color={COLOR.wellbeing} label="Wellbeing" />
        {!isUnlocked && <LegendDot color={COLOR.locked} label="Locked" />}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-shrink-0 rounded-full border-[1.5px] border-white/60"
        style={{ width: 10, height: 10, background: color }}
      />
      <span className="text-[10px] leading-none text-umber">{label}</span>
    </div>
  );
}
