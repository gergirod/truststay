"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { Place } from "@/types";
import {
  MAP_COLORS,
  createBaseMarker,
  createPlaceMarker,
  createLockedMarker,
} from "@/lib/mapMarkers";

interface CityMapProps {
  places: Place[];
  baseLat?: number;
  baseLon?: number;
  isUnlocked: boolean;
  /** IDs of places shown as full cards in the free tier */
  freePlaceIds: string[];
  cityName: string;
  /** Total place count shown in the header chip */
  totalPlaces?: number;
}

export function CityMap({
  places,
  baseLat,
  baseLon,
  isUnlocked,
  freePlaceIds,
  cityName,
  totalPlaces,
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

        // coreBounds: base + visible places only — used for zoom
        // fullBounds: all places — locked dots render but don't affect zoom
        const coreBounds = new mapboxgl.LngLatBounds();
        let coreCount = 0;

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
          coreBounds.extend([baseLon, baseLat]);
          coreCount++;
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

            // Only visible places contribute to zoom bounds
            coreBounds.extend([place.lon, place.lat]);
            coreCount++;
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
        }

        // ── Fit to core (base + visible) — locked outliers don't affect zoom
        if (coreCount > 1) {
          map!.fitBounds(coreBounds, { padding: 60, maxZoom: 15, duration: 0 });
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

  const placeCount = totalPlaces ?? places.length;

  return (
    <div>
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-bark">Routine map</p>
        {placeCount > 0 && (
          <span className="rounded-full border border-dune bg-white px-2.5 py-0.5 text-xs text-umber">
            {placeCount} place{placeCount !== 1 ? "s" : ""}
            {!isUnlocked ? " · some locked" : ""}
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-dune">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: "clamp(260px, 40vw, 380px)" }}
        />

        {/* Category legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2">
          <LegendDot color={MAP_COLORS.work} label="Work" />
          <LegendDot color={MAP_COLORS.coffee} label="Coffee & meals" />
          <LegendDot color={MAP_COLORS.wellbeing} label="Wellbeing" />
          {!isUnlocked && <LegendDot color={MAP_COLORS.locked} label="Locked" />}
        </div>
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
