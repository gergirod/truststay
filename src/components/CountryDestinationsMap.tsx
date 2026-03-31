"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityBucket } from "@/data/activityDestinations";

interface BrowseDestination {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  activities?: ActivityBucket[];
  activity?: "surf" | "other";
}

interface Props {
  destinations: BrowseDestination[];
}

const FOCUS_BOUNDS = {
  west: -122,
  south: -58,
  east: -30,
  north: 33,
};

type ActivityFilter = "all" | ActivityBucket;

const ACTIVITY_META: Record<
  ActivityFilter,
  { label: string; emoji: string; color: string }
> = {
  all: { label: "All", emoji: "🌎", color: "#2E2A26" },
  surf: { label: "Surf", emoji: "🏄", color: "#E07A5F" },
  dive: { label: "Dive", emoji: "🤿", color: "#5DA9E9" },
  hike: { label: "Hike", emoji: "🥾", color: "#6AA84F" },
  yoga: { label: "Yoga", emoji: "🧘", color: "#9B6AD6" },
  kite: { label: "Kite", emoji: "🪁", color: "#F2A93B" },
  work_first: { label: "Work", emoji: "💻", color: "#8FB7B3" },
};

const ACTIVITY_PILL_ORDER: ActivityFilter[] = [
  "all",
  "surf",
  "dive",
  "hike",
  "yoga",
  "kite",
  "work_first",
];

function isWithinFocusRegion(lat: number, lon: number): boolean {
  return (
    lon >= FOCUS_BOUNDS.west &&
    lon <= FOCUS_BOUNDS.east &&
    lat >= FOCUS_BOUNDS.south &&
    lat <= FOCUS_BOUNDS.north
  );
}

function getPrimaryActivity(activities: ActivityBucket[]): ActivityFilter {
  if (activities.includes("surf")) return "surf";
  if (activities.includes("dive")) return "dive";
  if (activities.includes("hike")) return "hike";
  if (activities.includes("yoga")) return "yoga";
  if (activities.includes("kite")) return "kite";
  if (activities.includes("work_first")) return "work_first";
  return "all";
}

function getActivitiesForDestination(d: BrowseDestination): ActivityBucket[] {
  if (d.activities && d.activities.length > 0) return d.activities;
  return d.activity === "surf" ? (["surf"] as ActivityBucket[]) : [];
}

function destinationPinHtml(primaryActivity: ActivityFilter): string {
  const pinColor = ACTIVITY_META[primaryActivity].color;
  const ringColor = primaryActivity === "all" ? "#DCEBE9" : "#F8F5F1";
  const centerIcon =
    primaryActivity === "surf"
      ? `<g>
          <path d="M12 6.4c-1 1.7-1.6 3.5-1.6 5.4s.6 3.7 1.6 5.4c1-1.7 1.6-3.5 1.6-5.4s-.6-3.7-1.6-5.4z" fill="white" opacity="0.96"/>
          <path d="M7.5 16.5c1.5-1 3-1 4.5 0s3 1 4.5 0" stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        </g>`
      : `<g>
          <circle cx="12" cy="11.5" r="5.3" fill="${ringColor}"/>
          <circle cx="12" cy="11.5" r="2.7" fill="white"/>
        </g>`;

  return `<div style="
    width:24px;
    height:32px;
    position:relative;
  ">
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 8.4 11 18.8 11 18.8S23 20.4 23 12C23 5.9 18.1 1 12 1z" fill="${pinColor}"/>
      ${centerIcon}
    </svg>
  </div>`;
}

function fitMapToPoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  points: Array<{ lat: number; lon: number }>,
  padding = 80,
) {
  if (!points.length) return;
  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  map.fitBounds(
    [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    { padding, duration: 700 },
  );
}

function applySandMapTheme(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
) {
  const setFill = (layerId: string, color: string) => {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "fill-color", color);
  };
  const setBg = (layerId: string, color: string) => {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "background-color", color);
  };

  // Blend base map into TrustStay sand tones.
  setBg("background", "#F8F5F1");
  setFill("land", "#F8F5F1");
  setFill("land-structure-polygon", "#F1ECE5");
  setFill("water", "#EEE8DF");
  setFill("water-shadow", "#EEE8DF");
  setFill("park", "#EEF3EC");
  setFill("national-park", "#EEF3EC");
}

export function CountryDestinationsMap({ destinations }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");
  const focusRegionDestinations = useMemo(
    () => destinations.filter((d) => isWithinFocusRegion(d.lat, d.lon)),
    [destinations],
  );
  const availableActivityFilters = useMemo(() => {
    const present = new Set<ActivityFilter>(["all"]);
    for (const destination of focusRegionDestinations) {
      for (const activity of getActivitiesForDestination(destination)) {
        present.add(activity);
      }
    }
    return ACTIVITY_PILL_ORDER.filter((activity) => present.has(activity));
  }, [focusRegionDestinations]);

  useEffect(() => {
    if (!availableActivityFilters.includes(activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, availableActivityFilters]);

  const visibleDestinations = useMemo(
    () => {
      return focusRegionDestinations.filter((d) => {
        const activities = getActivitiesForDestination(d);
        return activeFilter === "all" || activities.includes(activeFilter);
      });
    },
    [activeFilter, focusRegionDestinations],
  );

  useEffect(() => {
    if (!containerRef.current || !token) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-75, -12],
        zoom: 3,
        minZoom: 1.5,
        maxZoom: 12,
        maxBounds: [
          [FOCUS_BOUNDS.west, FOCUS_BOUNDS.south],
          [FOCUS_BOUNDS.east, FOCUS_BOUNDS.north],
        ],
        attributionControl: false,
      });

      // Keep coverage view stable: allow pan, disable zoom interactions.
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
      map.keyboard.disable();

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      map.on("load", () => {
        if (!map) return;
        applySandMapTheme(map);

        for (const destination of visibleDestinations) {
          const el = document.createElement("button");
          el.type = "button";
          el.style.cursor = "pointer";
          el.style.background = "transparent";
          el.style.border = "none";
          el.style.padding = "0";
          const activities = getActivitiesForDestination(destination);
          el.innerHTML = destinationPinHtml(getPrimaryActivity(activities));
          el.setAttribute("aria-label", destination.name);

          const popup = new mapboxgl.Popup({
            offset: 14,
            closeButton: false,
            className: "truststay-popup",
            maxWidth: "220px",
          }).setHTML(`
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:8px 10px;">
              <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#8A847D;">${destination.country}</p>
              <p style="margin:4px 0 8px 0;font-size:14px;font-weight:600;color:#2E2A26;">${destination.name}</p>
              <a href="/city/${destination.slug}" style="font-size:12px;color:white;background:#2E2A26;padding:4px 9px;border-radius:9999px;text-decoration:none;">Open destination</a>
            </div>
          `);

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: "bottom",
          })
            .setLngLat([destination.lon, destination.lat])
            .setPopup(popup)
            .addTo(map);
          el.addEventListener("click", () => marker.togglePopup());
        }

        fitMapToPoints(map, visibleDestinations, 78);
      });
    }

    init().catch(console.warn);

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any)?.remove();
    };
  }, [token, visibleDestinations]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-dune bg-white p-5 text-sm text-umber">
        Map is unavailable because `NEXT_PUBLIC_MAPBOX_TOKEN` is missing.
      </div>
    );
  }

  if (!visibleDestinations.length) {
    return (
      <div className="rounded-2xl border border-dune bg-white p-5 text-sm text-umber">
        No destinations available in LATAM, Caribbean, or Central America yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-4xl space-y-3 px-6">
        <p className="text-xs text-umber">
          {visibleDestinations.length} destinations in LATAM, Caribbean, and Central America
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {availableActivityFilters.map((activity) => {
            const active = activity === activeFilter;
            const meta = ACTIVITY_META[activity];
            return (
              <button
                key={activity}
                type="button"
                onClick={() => setActiveFilter(activity)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: active ? meta.color : "#E8E3DC",
                  background: active ? meta.color : "white",
                  color: active ? "white" : "#5F5A54",
                }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                  style={{
                    background: active ? "rgba(255,255,255,0.2)" : meta.color,
                    color: "white",
                  }}
                >
                  {meta.emoji}
                </span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden border-y border-dune bg-sand"
        style={{ height: "clamp(420px, 72vh, 780px)" }}
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

