"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityBucket } from "@/data/activityDestinations";
import { track } from "@/lib/analytics";

interface BrowseDestination {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  activities?: ActivityBucket[];
  activity?: "surf" | "other";
}

interface RenderDestination extends BrowseDestination {
  displayLat: number;
  displayLon: number;
}

interface CountryCluster {
  country: string;
  destinations: RenderDestination[];
  centerLat: number;
  centerLon: number;
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
  { label: string; color: string }
> = {
  all: { label: "All", color: "#2E2A26" },
  surf: { label: "Surf", color: "#E07A5F" },
  dive: { label: "Dive", color: "#5DA9E9" },
  hike: { label: "Hike", color: "#6AA84F" },
  yoga: { label: "Yoga", color: "#9B6AD6" },
  kite: { label: "Kite", color: "#F2A93B" },
  work_first: { label: "Work", color: "#8FB7B3" },
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

const STACK_DISTANCE_KM = 18;
const STACK_OFFSET_KM = 1.6;

function isWithinFocusRegion(lat: number, lon: number): boolean {
  return (
    lon >= FOCUS_BOUNDS.west &&
    lon <= FOCUS_BOUNDS.east &&
    lat >= FOCUS_BOUNDS.south &&
    lat <= FOCUS_BOUNDS.north
  );
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function withDisplayOffsets(destinations: BrowseDestination[]): RenderDestination[] {
  const groups: {
    anchorLat: number;
    anchorLon: number;
    members: BrowseDestination[];
  }[] = [];

  for (const destination of destinations) {
    const group = groups.find((candidate) => {
      return (
        distanceKm(
          candidate.anchorLat,
          candidate.anchorLon,
          destination.lat,
          destination.lon,
        ) <= STACK_DISTANCE_KM
      );
    });

    if (group) {
      group.members.push(destination);
      continue;
    }

    groups.push({
      anchorLat: destination.lat,
      anchorLon: destination.lon,
      members: [destination],
    });
  }

  const rendered: RenderDestination[] = [];
  for (const group of groups) {
    if (group.members.length === 1) {
      const only = group.members[0];
      rendered.push({ ...only, displayLat: only.lat, displayLon: only.lon });
      continue;
    }

    group.members.forEach((destination, index) => {
      const ring = Math.floor(index / 8);
      const ringIndex = index % 8;
      const ringSize = Math.min(8, group.members.length - ring * 8);
      const angle = (2 * Math.PI * ringIndex) / ringSize;
      const radiusKm = STACK_OFFSET_KM * (1 + ring * 0.7);
      const latOffset = (radiusKm / 111) * Math.sin(angle);
      const lonScale = Math.max(
        0.18,
        Math.cos((group.anchorLat * Math.PI) / 180),
      );
      const lonOffset = (radiusKm / (111 * lonScale)) * Math.cos(angle);

      rendered.push({
        ...destination,
        displayLat: destination.lat + latOffset,
        displayLon: destination.lon + lonOffset,
      });
    });
  }

  return rendered;
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
      : primaryActivity === "dive"
      ? `<g>
          <rect x="7" y="8.2" width="10" height="4.6" rx="2.2" fill="white" opacity="0.96"/>
          <path d="M9 13.2c0 1.8 1.3 3.2 3 3.2s3-1.4 3-3.2" stroke="white" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <rect x="15.8" y="9.5" width="2.2" height="1.8" rx="0.8" fill="white" opacity="0.96"/>
        </g>`
      : primaryActivity === "hike"
      ? `<g>
          <path d="M7 16.5l3.2-6.5 3.2 6.5H7z" fill="white" opacity="0.96"/>
          <path d="M10.2 16.5l2.8-5 2.8 5h-5.6z" fill="white" opacity="0.88"/>
        </g>`
      : primaryActivity === "yoga"
      ? `<g>
          <circle cx="12" cy="8.5" r="1.5" fill="white" opacity="0.96"/>
          <path d="M8.3 14.8c1-1.3 2.2-2 3.7-2s2.7.7 3.7 2" stroke="white" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <path d="M7.8 16.5c1.3-.8 2.7-1.1 4.2-1.1s2.9.3 4.2 1.1" stroke="white" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        </g>`
      : primaryActivity === "kite"
      ? `<g>
          <path d="M12 7.6l3.2 3.8L12 15.2 8.8 11.4 12 7.6z" fill="white" opacity="0.96"/>
          <path d="M12 15.2v3.1" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
          <path d="M12 18.3l-1 .9m1-.2l1 .9" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
        </g>`
      : primaryActivity === "work_first"
      ? `<g>
          <rect x="8" y="9.4" width="8" height="5.6" rx="1.1" fill="white" opacity="0.96"/>
          <path d="M10 9.4v-1c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v1" stroke="white" stroke-width="1.1" fill="none"/>
        </g>`
      : `<g>
          <circle cx="12" cy="11.5" r="5.3" fill="${ringColor}"/>
          <circle cx="12" cy="11.5" r="2.7" fill="white"/>
        </g>`;

  return `<div style="
    width:24px;
    height:32px;
    position:relative;
    filter:drop-shadow(0 3px 6px rgba(46,42,38,0.26));
  ">
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 8.4 11 18.8 11 18.8S23 20.4 23 12C23 5.9 18.1 1 12 1z" fill="${pinColor}" stroke="white" stroke-width="1.2"/>
      ${centerIcon}
    </svg>
  </div>`;
}

function destinationHoverLabelHtml(destination: BrowseDestination): string {
  return `<div style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    color:#1F2937;
    border-radius:12px;
    padding:8px 10px;
    font-size:12px;
    font-weight:700;
    line-height:1.2;
    letter-spacing:.01em;
    white-space:normal;
    max-width:220px;
  ">${destination.name}</div>`;
}

function countryClusterPinHtml(count: number, activeFilter: ActivityFilter): string {
  const accent = ACTIVITY_META[activeFilter].color;
  const isFiltered = activeFilter !== "all";
  const shell = isFiltered ? "#FFFFFF" : "#FFF7EB";
  const border = isFiltered ? accent : "#DED6CB";
  const text = isFiltered ? accent : "#2E2A26";
  return `<div style="
    width:38px;
    height:38px;
    border-radius:9999px;
    background:${shell};
    color:${text};
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:12px;
    font-weight:700;
    display:flex;
    align-items:center;
    justify-content:center;
    border:1.5px solid ${border};
    box-shadow:${isFiltered ? "0 8px 16px rgba(31,41,55,0.14)" : "0 6px 14px rgba(46,42,38,0.12)"};
    letter-spacing:.01em;
    line-height:1;
  " class="ts-country-cluster-marker">
    ${count}
  </div>`;
}

function countryClusterHoverHtml(cluster: CountryCluster): string {
  const names = cluster.destinations
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  const shown = names.slice(0, 10);
  const remaining = Math.max(0, names.length - shown.length);
  return `<div style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    color:#1F2937;
    border-radius:14px;
    padding:10px 12px 11px;
    min-width:200px;
    max-width:300px;
  ">
    <div style="margin:0 0 8px 0;">
      <span style="
        display:inline-flex;
        align-items:center;
        border-radius:9999px;
        border:1px solid #E4DDD2;
        background:#F8F3EB;
        color:#5F5A54;
        font-size:10px;
        font-weight:600;
        letter-spacing:.06em;
        text-transform:uppercase;
        padding:3px 8px;
      ">${cluster.country}</span>
    </div>
    <p style="margin:0 0 7px 0;font-size:13px;font-weight:700;color:#1F2937;">${cluster.destinations.length} destinations</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#374151;">
      ${shown.join(" • ")}
      ${remaining > 0 ? ` · +${remaining} more` : ""}
    </p>
  </div>`;
}

function buildCountryClusters(destinations: RenderDestination[]): CountryCluster[] {
  const grouped = new Map<string, RenderDestination[]>();
  for (const destination of destinations) {
    const current = grouped.get(destination.country) ?? [];
    current.push(destination);
    grouped.set(destination.country, current);
  }
  return [...grouped.entries()].map(([country, members]) => ({
    country,
    destinations: members,
    centerLat: members.reduce((sum, d) => sum + d.displayLat, 0) / members.length,
    centerLon: members.reduce((sum, d) => sum + d.displayLon, 0) / members.length,
  }));
}

function destinationHref(slug: string, activeFilter: ActivityFilter): string {
  if (activeFilter === "all") return `/city/${slug}`;
  const params = new URLSearchParams({
    purpose: activeFilter,
    workStyle: "balanced",
    dailyBalance: activeFilter === "work_first" ? "work_first" : "balanced",
  });
  return `/city/${slug}?${params.toString()}`;
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
  const safeSetPaint = (
    layerId: string,
    property: string,
    color: string,
  ) => {
    try {
      if (!map.getLayer(layerId)) return;
      map.setPaintProperty(layerId, property, color);
    } catch {
      // Some style layers may not support the requested paint property.
      // Ignore safely so marker rendering is never blocked.
    }
  };

  const setFill = (layerId: string, color: string) => {
    safeSetPaint(layerId, "fill-color", color);
  };
  const setBg = (layerId: string, color: string) => {
    safeSetPaint(layerId, "background-color", color);
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
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const totalDestinationsFromDb = destinations.length;
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
  const activityCounts = useMemo(() => {
    const counts: Record<ActivityFilter, number> = {
      all: focusRegionDestinations.length,
      surf: 0,
      dive: 0,
      hike: 0,
      yoga: 0,
      kite: 0,
      work_first: 0,
    };
    for (const destination of focusRegionDestinations) {
      const activities = getActivitiesForDestination(destination);
      for (const activity of activities) {
        counts[activity] += 1;
      }
    }
    return counts;
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
  const renderedDestinations = useMemo(
    () => withDisplayOffsets(visibleDestinations),
    [visibleDestinations],
  );
  const countryClusters = useMemo(
    () => buildCountryClusters(renderedDestinations),
    [renderedDestinations],
  );
  const focusedDestinations = useMemo(
    () =>
      selectedCountry
        ? renderedDestinations.filter((d) => d.country === selectedCountry)
        : renderedDestinations,
    [renderedDestinations, selectedCountry],
  );
  const profilePresetCount = useMemo(
    () =>
      visibleDestinations.filter(
        (d) => getActivitiesForDestination(d).length > 0,
      ).length,
    [visibleDestinations],
  );

  useEffect(() => {
    if (!selectedCountry) return;
    const exists = renderedDestinations.some((d) => d.country === selectedCountry);
    if (!exists) setSelectedCountry(null);
  }, [selectedCountry, renderedDestinations]);

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
        projection: "mercator",
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
        if (!selectedCountry) {
          for (const cluster of countryClusters) {
            const el = document.createElement("button");
            el.type = "button";
            el.className = "ts-country-cluster-hit";
            el.style.cursor = "pointer";
            el.style.background = "transparent";
            el.style.border = "none";
            el.style.padding = "0";
            el.innerHTML = countryClusterPinHtml(
              cluster.destinations.length,
              activeFilter,
            );
            el.setAttribute("aria-label", `${cluster.country} destinations`);

            const popup = new mapboxgl.Popup({
              offset: 12,
              closeButton: false,
              className: "truststay-popup",
              maxWidth: "280px",
            }).setHTML(countryClusterHoverHtml(cluster));

            new mapboxgl.Marker({
              element: el,
              anchor: "center",
            })
              .setLngLat([cluster.centerLon, cluster.centerLat])
              .setPopup(popup)
              .addTo(map);

            el.addEventListener("mouseenter", () => {
              if (!map) return;
              el.classList.add("is-hovered");
              popup.addTo(map);
            });
            el.addEventListener("mouseleave", () => {
              el.classList.remove("is-hovered");
              popup.remove();
            });
            el.addEventListener("click", () => {
              el.classList.remove("is-hovered");
              popup.remove();
              track("destination_cluster_opened", {
                country: cluster.country,
                destination_count: cluster.destinations.length,
                active_filter: activeFilter,
              });
              setSelectedCountry(cluster.country);
            });
          }

          fitMapToPoints(map, focusRegionDestinations, 130);
          return;
        }

        for (const destination of focusedDestinations) {
          const el = document.createElement("button");
          el.type = "button";
          el.style.cursor = "pointer";
          el.style.background = "transparent";
          el.style.border = "none";
          el.style.padding = "0";
          const activities = getActivitiesForDestination(destination);
          const markerActivity =
            activeFilter !== "all" && activities.includes(activeFilter)
              ? activeFilter
              : getPrimaryActivity(activities);
          el.innerHTML = destinationPinHtml(markerActivity);
          el.setAttribute("aria-label", destination.name);

          const popup = new mapboxgl.Popup({
            offset: 14,
            closeButton: false,
            className: "truststay-popup",
            maxWidth: "220px",
          }).setHTML(destinationHoverLabelHtml(destination));

          new mapboxgl.Marker({
            element: el,
            anchor: "bottom",
          })
            .setLngLat([destination.displayLon, destination.displayLat])
            .setPopup(popup)
            .addTo(map);

          el.addEventListener("mouseenter", () => {
            if (!map) return;
            popup.addTo(map);
          });
          el.addEventListener("mouseleave", () => {
            popup.remove();
          });

          const href = destinationHref(destination.slug, activeFilter);
          el.addEventListener("click", () => {
            popup.remove();
            track("destination_clicked_from_map", {
              city_slug: destination.slug,
              city_name: destination.name,
              country: destination.country,
              active_filter: activeFilter,
            });
            window.location.href = href;
          });
        }

        fitMapToPoints(
          map,
          focusedDestinations.map((d) => ({ lat: d.displayLat, lon: d.displayLon })),
          130,
        );
      });
    }

    init().catch(console.warn);

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any)?.remove();
    };
  }, [
    activeFilter,
    countryClusters,
    focusRegionDestinations,
    focusedDestinations,
    selectedCountry,
    token,
  ]);

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
    <div className="space-y-2">
      <div className="mx-auto max-w-4xl space-y-2 px-6">
        <p className="text-xs text-umber">
          {totalDestinationsFromDb} destinations loaded from DB
        </p>
        <p className="text-xs text-umber">
          {selectedCountry
            ? `Showing ${focusedDestinations.length} destinations in ${selectedCountry}`
            : `Showing ${visibleDestinations.length} destinations in LATAM, Caribbean, and Central America`}
        </p>
        <p className="text-xs text-umber/80">
          {profilePresetCount} open with activity-aware presets. Every destination opens in free preview first, then you can shape your stay.
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {selectedCountry && (
            <button
              type="button"
              onClick={() => setSelectedCountry(null)}
              className="flex flex-shrink-0 items-center gap-1 rounded-full border border-dune bg-white px-3 py-1.5 text-xs font-medium text-umber transition-colors hover:border-bark/30 hover:text-bark"
            >
              Reset country
            </button>
          )}
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
                  boxShadow: active ? "0 4px 10px rgba(46,42,38,0.18)" : "none",
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px]"
                  style={{
                    background: active ? "rgba(255,255,255,0.22)" : meta.color,
                    color: "white",
                  }}
                />
                <span>{meta.label} ({activityCounts[activity]})</span>
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

