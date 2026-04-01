"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { Place, DailyLifePlace, StayIntent } from "@/types";
import {
  MAP_COLORS,
  createBaseMarker,
  createPlaceMarker,
  createLockedMarker,
  createDailyLifeMarker,
} from "@/lib/mapMarkers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MicroAreaZone {
  id: string;
  name: string;
  center: { lat: number; lon: number };
  radius_km: number;
  rank?: number;
  score?: number;
  hasConstraintBreakers?: boolean;
  strengths?: string[];
  weaknesses?: string[];
}

interface CityMapProps {
  citySlug: string;
  places: Place[];
  baseLat?: number;
  baseLon?: number;
  isUnlocked: boolean;
  freePlaceIds: string[];
  cityName: string;
  totalPlaces?: number;
  dailyLifePlaces?: DailyLifePlace[];
  intent?: StayIntent | null;
  baseAreaName?: string | null;
  microAreas?: MicroAreaZone[];
}

// ── Zone styling ──────────────────────────────────────────────────────────────

const ZONE_STYLES = {
  winner:   { fill: "#16a34a", border: "#16a34a", fillOpacity: 0.12, borderOpacity: 0.75 },
  runnerUp: { fill: "#d97706", border: "#d97706", fillOpacity: 0.09, borderOpacity: 0.65 },
  third:    { fill: "#6b7280", border: "#6b7280", fillOpacity: 0.07, borderOpacity: 0.50 },
  broken:   { fill: "#9ca3af", border: "#9ca3af", fillOpacity: 0.04, borderOpacity: 0.30 },
  unscored: { fill: "#6366f1", border: "#6366f1", fillOpacity: 0.09, borderOpacity: 0.55 },
} as const;

function getZoneStyle(zone: MicroAreaZone) {
  if (zone.rank === undefined) return ZONE_STYLES.unscored;
  if (zone.hasConstraintBreakers) return ZONE_STYLES.broken;
  if (zone.rank === 1) return ZONE_STYLES.winner;
  if (zone.rank === 2) return ZONE_STYLES.runnerUp;
  return ZONE_STYLES.third;
}

// ── Haversine distance check ──────────────────────────────────────────────────

function isWithinZone(
  placeLat: number, placeLon: number,
  zoneLat: number, zoneLon: number,
  radiusKm: number
): boolean {
  const R = 6371;
  const dLat = ((placeLat - zoneLat) * Math.PI) / 180;
  const dLon = ((placeLon - zoneLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((zoneLat * Math.PI) / 180) *
    Math.cos((placeLat * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= radiusKm * 1.5; // 1.5x buffer
}

// ── Circle polygon helper ─────────────────────────────────────────────────────

function circlePolygon(
  lat: number, lon: number, radiusKm: number, steps = 48
): GeoJSON.Feature<GeoJSON.Polygon> {
  const latRad = (lat * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLon = (radiusKm / 111.32) / Math.cos(latRad);
    const dLat = radiusKm / 110.57;
    coords.push([lon + dLon * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
}

// ── Zone badge HTML marker ────────────────────────────────────────────────────

function createZoneBadge(zone: MicroAreaZone, interactive = false): HTMLElement {
  const style = getZoneStyle(zone);
  const isBroken = zone.hasConstraintBreakers;
  const hasScore = zone.score !== undefined;
  const isWinner = zone.rank === 1 && !isBroken;

  const wrap = document.createElement("div");
  wrap.style.cssText = `
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    cursor: ${interactive ? "pointer" : "default"};
    pointer-events: ${interactive ? "auto" : "none"};
  `;

  if (isWinner) {
    const ring = document.createElement("div");
    ring.style.cssText = `
      width: 10px; height: 10px; border-radius: 50%;
      background: ${style.fill};
      box-shadow: 0 0 0 3px white, 0 0 0 5px ${style.fill};
    `;
    wrap.appendChild(ring);
  }

  const pill = document.createElement("div");
  pill.style.cssText = `
    background: ${style.fill}; color: white; border-radius: 20px; padding: 3px 8px;
    font-size: 11px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.25); line-height: 1.4;
    display: flex; align-items: center; gap: 4px; opacity: ${isBroken ? 0.7 : 1};
    transition: transform 0.15s; transform: scale(1);
  `;
  if (interactive) {
    pill.addEventListener("mouseover", () => { pill.style.transform = "scale(1.06)"; });
    pill.addEventListener("mouseout", () => { pill.style.transform = "scale(1)"; });
  }

  if (hasScore && !isBroken) {
    const rankSpan = document.createElement("span");
    rankSpan.style.cssText = "opacity: 0.85; font-size: 10px;";
    rankSpan.textContent = `#${zone.rank}`;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = zone.name;
    const scoreSpan = document.createElement("span");
    scoreSpan.style.cssText = "opacity: 0.85; font-size: 10px;";
    scoreSpan.textContent = `${zone.score?.toFixed(1)}`;
    pill.appendChild(rankSpan);
    pill.appendChild(nameSpan);
    pill.appendChild(scoreSpan);
  } else if (isBroken) {
    pill.innerHTML = `<span style="font-size:10px">🚫</span> ${zone.name}`;
  } else {
    pill.textContent = zone.name;
  }

  if (interactive && !isBroken) {
    const hint = document.createElement("div");
    hint.style.cssText = `
      font-size: 9px; color: white; background: rgba(0,0,0,0.5); border-radius: 8px;
      padding: 1px 5px; white-space: nowrap; opacity: 0.9;
    `;
    hint.textContent = "Click to explore →";
    wrap.appendChild(pill);
    wrap.appendChild(hint);
  } else {
    wrap.appendChild(pill);
  }

  return wrap;
}

// ── Zone detail header badge ──────────────────────────────────────────────────

function createZoneDetailBadge(zone: MicroAreaZone): HTMLElement {
  const style = getZoneStyle(zone);
  const el = document.createElement("div");
  el.style.cssText = `
    background: ${style.fill}; color: white; border-radius: 20px; padding: 4px 10px;
    font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    white-space: nowrap; box-shadow: 0 1px 6px rgba(0,0,0,0.25);
    pointer-events: none;
  `;
  el.textContent = zone.score !== undefined
    ? `${zone.name} · ${zone.score.toFixed(1)}/10`
    : zone.name;
  return el;
}

// ── Intent label ──────────────────────────────────────────────────────────────

const PURPOSE_LABELS: Record<string, string> = {
  surf: "surf", dive: "diving", hike: "hiking",
  yoga: "yoga", kite: "kite", work_first: "focused work", exploring: "exploring",
};
const WORK_LABELS: Record<string, string> = {
  light: "light work", balanced: "balanced work", heavy: "intensive work",
};

type ConnectivityBucket = "excellent" | "good" | "okay" | "risky";
type ConfidenceBucket = "low" | "medium" | "high";
type StarlinkStatus = "available" | "capacity_constrained" | "unknown" | "not_available";

interface ConnectivityCellData {
  id: string;
  score: number;
  bucket: ConnectivityBucket;
  median_download_mbps: number | null;
  median_upload_mbps: number | null;
  median_latency_ms: number | null;
  confidence: ConfidenceBucket;
  freshness_days: number | null;
  summary_short: string;
}

const CONNECTIVITY_BUCKET_META: Record<
  ConnectivityBucket,
  { label: string; fill: string; line: string }
> = {
  excellent: { label: "Excellent", fill: "#22c55e", line: "#15803d" },
  good: { label: "Good", fill: "#84cc16", line: "#4d7c0f" },
  okay: { label: "Okay", fill: "#f59e0b", line: "#b45309" },
  risky: { label: "Risky", fill: "#ef4444", line: "#b91c1c" },
};

const CONNECTIVITY_SOURCE_ID = "connectivity-cells";
const CONNECTIVITY_FILL_ID = "connectivity-cells-fill";
const CONNECTIVITY_LINE_ID = "connectivity-cells-line";

function scoreToBucket(score: number): ConnectivityBucket {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "okay";
  return "risky";
}

function recommendationForBucket(bucket: ConnectivityBucket): string {
  if (bucket === "excellent") return "Great for video calls and remote work.";
  if (bucket === "good") return "Good for normal work and light uploads.";
  if (bucket === "okay") return "Okay for async work, not ideal for heavy calls.";
  return "Risky if internet is mission-critical.";
}

function estimatedStarlinkStatus(lat: number): StarlinkStatus {
  const absLat = Math.abs(lat);
  if (absLat > 55) return "capacity_constrained";
  if (absLat < 50) return "available";
  return "unknown";
}

function starlinkLabel(status: StarlinkStatus): string {
  if (status === "available") return "Starlink fallback available";
  if (status === "capacity_constrained") return "Starlink capacity constrained";
  if (status === "not_available") return "Starlink not available";
  return "Starlink status unknown";
}

function intentLabel(intent: StayIntent): string {
  if (intent.purpose === "work_first") return "focused remote work";
  return `${PURPOSE_LABELS[intent.purpose] ?? intent.purpose} + ${WORK_LABELS[intent.workStyle] ?? intent.workStyle}`;
}

function buildConnectivityMockCells(
  centerLat: number,
  centerLon: number,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const latStep = 0.012;
  const lonStep = 0.012 / Math.max(0.4, Math.cos((centerLat * Math.PI) / 180));
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  let idx = 0;

  for (const y of [-1, 0, 1]) {
    for (const x of [-1, 0, 1]) {
      const cLat = centerLat + y * latStep;
      const cLon = centerLon + x * lonStep;
      const halfLat = latStep * 0.45;
      const halfLon = lonStep * 0.45;
      const scoreBase = 88 - Math.abs(x) * 11 - Math.abs(y) * 9 - (idx % 3) * 5;
      const score = Math.max(34, Math.min(96, scoreBase));
      const bucket = scoreToBucket(score);
      const confidence: ConfidenceBucket =
        score > 80 ? "high" : score > 60 ? "medium" : "low";
      const download = Math.max(8, Math.round(score * 1.8));
      const upload = Math.max(3, Math.round(score * 0.55));
      const latency = Math.max(22, Math.round(130 - score));

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [cLon - halfLon, cLat - halfLat],
            [cLon + halfLon, cLat - halfLat],
            [cLon + halfLon, cLat + halfLat],
            [cLon - halfLon, cLat + halfLat],
            [cLon - halfLon, cLat - halfLat],
          ]],
        },
        properties: {
          id: `cell-${idx}`,
          score,
          bucket,
          median_download_mbps: download,
          median_upload_mbps: upload,
          median_latency_ms: latency,
          confidence,
          freshness_days: 4 + (idx % 8),
          summary_short: recommendationForBucket(bucket),
        },
      });
      idx += 1;
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CityMap({
  citySlug,
  places,
  baseLat,
  baseLon,
  isUnlocked,
  freePlaceIds,
  cityName,
  totalPlaces,
  dailyLifePlaces = [],
  intent,
  baseAreaName,
  microAreas,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<{ place: any[]; dl: any[]; badge: any[]; detailBadge: any | null }>({
    place: [], dl: [], badge: [], detailBadge: null,
  });
  const overviewBoundsRef = useRef<unknown>(null);
  const onZoneClickRef = useRef<((zone: MicroAreaZone) => void) | null>(null);

  const [activeZone, setActiveZone] = useState<MicroAreaZone | null>(null);
  const [showConnectivity, setShowConnectivity] = useState(true);
  const [showStarlink, setShowStarlink] = useState(false);
  const [hoveredConnectivity, setHoveredConnectivity] = useState<ConnectivityCellData | null>(null);
  const [selectedConnectivity, setSelectedConnectivity] = useState<ConnectivityCellData | null>(null);
  const [connectivityGeojson, setConnectivityGeojson] = useState<GeoJSON.FeatureCollection<GeoJSON.Polygon> | null>(null);
  const [starlinkLabelText, setStarlinkLabelText] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const freeSet = new Set(freePlaceIds);
  const hasZones = microAreas && microAreas.length > 0;
  const hasScores = hasZones && microAreas.some((z) => z.score !== undefined);
  const interactiveZones = hasZones
    ? microAreas.filter((z) => !z.hasConstraintBreakers)
    : [];
  const shouldAutoDrillSingleZone = interactiveZones.length === 1;
  const mapFocusCenter = useMemo(() => {
    if (activeZone) return { lat: activeZone.center.lat, lon: activeZone.center.lon };
    if (hasZones && microAreas && microAreas[0]) {
      return { lat: microAreas[0].center.lat, lon: microAreas[0].center.lon };
    }
    return { lat: baseLat ?? places[0]?.lat ?? 0, lon: baseLon ?? places[0]?.lon ?? 0 };
  }, [activeZone, hasZones, microAreas, baseLat, baseLon, places]);
  const starlinkStatus = useMemo(
    () => estimatedStarlinkStatus(mapFocusCenter.lat),
    [mapFocusCenter.lat],
  );

  useEffect(() => {
    if (!showConnectivity) return;
    let cancelled = false;
    fetch(`/api/connectivity/cells?citySlug=${encodeURIComponent(citySlug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.type === "FeatureCollection" && Array.isArray(json.features)) {
          setConnectivityGeojson(json as GeoJSON.FeatureCollection<GeoJSON.Polygon>);
          return;
        }
        setConnectivityGeojson(
          buildConnectivityMockCells(mapFocusCenter.lat, mapFocusCenter.lon),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setConnectivityGeojson(
          buildConnectivityMockCells(mapFocusCenter.lat, mapFocusCenter.lon),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [citySlug, mapFocusCenter.lat, mapFocusCenter.lon, showConnectivity]);

  useEffect(() => {
    if (!showStarlink) return;
    let cancelled = false;
    fetch(
      `/api/connectivity/starlink?lat=${encodeURIComponent(String(mapFocusCenter.lat))}&lng=${encodeURIComponent(String(mapFocusCenter.lon))}`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const label = typeof json?.fallback?.display_label === "string"
          ? (json.fallback.display_label as string)
          : starlinkLabel(starlinkStatus);
        setStarlinkLabelText(label);
      })
      .catch(() => {
        if (cancelled) return;
        setStarlinkLabelText(starlinkLabel(starlinkStatus));
      });
    return () => {
      cancelled = true;
    };
  }, [showStarlink, mapFocusCenter.lat, mapFocusCenter.lon, starlinkStatus]);

  // ── Fly back to zone overview ───────────────────────────────────────────────
  const flyToOverview = useCallback(() => {
    const map = mapRef.current as (import("mapbox-gl").Map | null);
    if (!map) return;

    // Remove detail badge
    const m = markersRef.current;
    m.detailBadge?.remove();
    m.detailBadge = null;

    // Show all zone badges, hide place + dl markers
    m.badge.forEach((marker) => {
      const el = marker.getElement() as HTMLElement;
      el.style.display = "";
    });
    m.place.forEach((marker) => {
      const el = marker.getElement() as HTMLElement;
      el.style.display = "none";
    });
    m.dl.forEach((marker) => {
      const el = marker.getElement() as HTMLElement;
      el.style.display = "none";
    });

    // Restore all zone fill/line opacities
    if (microAreas && hasZones) {
      microAreas.forEach((zone) => {
        const style = getZoneStyle(zone);
        try {
          map.setPaintProperty(`zone-fill-${zone.id}`, "fill-opacity", style.fillOpacity);
          map.setPaintProperty(`zone-line-${zone.id}`, "line-opacity", style.borderOpacity);
        } catch { /* layer may not exist */ }
      });
    }

    // Fly back to overview
    if (overviewBoundsRef.current) {
      map.fitBounds(overviewBoundsRef.current as import("mapbox-gl").LngLatBoundsLike, {
        padding: { top: 40, bottom: 56, left: 32, right: 32 },
        maxZoom: 14,
        duration: 600,
      });
    }

    setActiveZone(null);
    setSelectedConnectivity(null);
    setHoveredConnectivity(null);
  }, [microAreas, hasZones]);

  // ── Fly into a zone (layer 2) ───────────────────────────────────────────────
  const flyToZone = useCallback((zone: MicroAreaZone) => {
    const mapboxgl = (window as unknown as { mapboxgl?: typeof import("mapbox-gl").default }).mapboxgl;
    const map = mapRef.current as (import("mapbox-gl").Map | null);
    if (!map || !mapboxgl) return;

    setActiveZone(zone);
    setSelectedConnectivity(null);

    // Dim non-selected zones
    if (microAreas && hasZones) {
      microAreas.forEach((z) => {
        const isSelected = z.id === zone.id;
        try {
          map.setPaintProperty(`zone-fill-${z.id}`, "fill-opacity", isSelected ? 0.08 : 0.02);
          map.setPaintProperty(`zone-line-${z.id}`, "line-opacity", isSelected ? 0.6 : 0.15);
        } catch { /* ignore */ }
      });
    }

    // Hide zone badges
    markersRef.current.badge.forEach((marker) => {
      (marker.getElement() as HTMLElement).style.display = "none";
    });

    // Show a detail badge at zone center
    const detailEl = createZoneDetailBadge(zone);
    const mapboxglLib = (window as unknown as Record<string, unknown>).mapboxgl as typeof import("mapbox-gl").default;
    if (mapboxglLib) {
      const detailMarker = new mapboxglLib.Marker({ element: detailEl, anchor: "center" })
        .setLngLat([zone.center.lon, zone.center.lat])
        .addTo(map as import("mapbox-gl").Map);
      markersRef.current.detailBadge = detailMarker;
    }

    // Show place markers in this zone
    let hasVisiblePlaces = false;
    markersRef.current.place.forEach((marker, i) => {
      const p = [...places, ...dailyLifePlaces][i];
      if (!p) return;
      const lat = "lat" in p ? p.lat : 0;
      const lon = "lon" in p ? p.lon : 0;
      const inZone = isWithinZone(lat, lon, zone.center.lat, zone.center.lon, zone.radius_km);
      const el = marker.getElement() as HTMLElement;
      el.style.display = inZone ? "" : "none";
      if (inZone) hasVisiblePlaces = true;
    });
    markersRef.current.dl.forEach((marker) => {
      const el = marker.getElement() as HTMLElement;
      el.style.display = "";
    });

    // Fly to zone
    const r = zone.radius_km;
    const latR = r / 110.57;
    const lonR = r / (111.32 * Math.cos((zone.center.lat * Math.PI) / 180));
    const bounds = [
      [zone.center.lon - lonR * 1.4, zone.center.lat - latR * 1.4],
      [zone.center.lon + lonR * 1.4, zone.center.lat + latR * 1.4],
    ] as import("mapbox-gl").LngLatBoundsLike;

    map.fitBounds(bounds, {
      padding: { top: 48, bottom: 48, left: 40, right: 40 },
      maxZoom: 15.5,
      duration: 700,
    });

    void hasVisiblePlaces; // suppress unused warning
  }, [microAreas, hasZones, places, dailyLifePlaces]);

  // Keep the click handler ref fresh without triggering map re-init
  useEffect(() => {
    onZoneClickRef.current = flyToZone;
  }, [flyToZone]);

  useEffect(() => {
    if (showConnectivity) return;
    setHoveredConnectivity(null);
    setSelectedConnectivity(null);
  }, [showConnectivity]);

  // ── Map initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !token) return;
    const hasAnyPoint =
      hasZones || (baseLat !== undefined && baseLon !== undefined) || places.length > 0;
    if (!hasAnyPoint) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;
    let cancelled = false;

    async function init() {
      const mapboxgl = (await import("mapbox-gl")).default;
        // Store globally so flyToZone can access the Marker constructor
      (window as unknown as Record<string, unknown>).mapboxgl = mapboxgl;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token!;

      const centerLon = hasZones ? microAreas![0].center.lon : (baseLon ?? places[0]?.lon ?? 0);
      const centerLat = hasZones ? microAreas![0].center.lat : (baseLat ?? places[0]?.lat ?? 0);

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [centerLon, centerLat],
        zoom: 13,
        attributionControl: false,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!map || cancelled) return;

        const coreBounds = new mapboxgl.LngLatBounds();
        let coreCount = 0;

        markersRef.current = { place: [], dl: [], badge: [], detailBadge: null };

        // ── Layer 1: Zone circles ────────────────────────────────────────────
        if (hasZones) {
          microAreas!.forEach((zone, idx) => {
            const style = getZoneStyle(zone);
            const sourceId = `zone-${zone.id}`;
            const fillId = `zone-fill-${zone.id}`;
            const lineId = `zone-line-${zone.id}`;
            const geojson = circlePolygon(zone.center.lat, zone.center.lon, zone.radius_km);

            map.addSource(sourceId, { type: "geojson", data: geojson });
            map.addLayer({ id: fillId, type: "fill", source: sourceId,
              paint: { "fill-color": style.fill, "fill-opacity": style.fillOpacity } });
            map.addLayer({ id: lineId, type: "line", source: sourceId,
              paint: {
                "line-color": style.border, "line-opacity": style.borderOpacity,
                "line-width": zone.rank === 1 && !zone.hasConstraintBreakers ? 2.5 : 1.5,
                "line-dasharray": zone.hasConstraintBreakers ? [3, 2] : [1],
              }
            });

            // Click on zone fill → drill into zone
            if (!zone.hasConstraintBreakers) {
              map.on("click", fillId, () => {
                onZoneClickRef.current?.(zone);
              });
              map.on("mouseenter", fillId, () => { map.getCanvas().style.cursor = "pointer"; });
              map.on("mouseleave", fillId, () => { map.getCanvas().style.cursor = ""; });
            }

            // Badge marker (interactive — also triggers drill-in)
            const badgeEl = createZoneBadge(zone, !zone.hasConstraintBreakers);
            if (!zone.hasConstraintBreakers) {
              badgeEl.addEventListener("click", (e) => {
                e.stopPropagation();
                onZoneClickRef.current?.(zone);
              });
            }
            const badgeMarker = new mapboxgl.Marker({ element: badgeEl, anchor: "center" })
              .setLngLat([zone.center.lon, zone.center.lat])
              .addTo(map);
            markersRef.current.badge.push(badgeMarker);

            // Extend overview bounds
            const r = zone.radius_km;
            const latR = r / 110.57;
            const lonR = r / (111.32 * Math.cos((zone.center.lat * Math.PI) / 180));
            coreBounds.extend([zone.center.lon - lonR, zone.center.lat - latR]);
            coreBounds.extend([zone.center.lon + lonR, zone.center.lat + latR]);
            coreCount++;

            if (idx > 0 && !zone.hasConstraintBreakers) {
              try { map.moveLayer(fillId); map.moveLayer(lineId); } catch { /* ignore */ }
            }
          });
        }

        // ── Base area marker (no zones) ─────────────────────────────────────
        if (!hasZones && baseLat !== undefined && baseLon !== undefined) {
          const el = createBaseMarker();
          const areaLabel = baseAreaName ?? cityName;
          const markerLabel = intent ? `Your base for ${intentLabel(intent)} — ${areaLabel}` : `Suggested base — ${areaLabel}`;
          const popup = new mapboxgl.Popup({ offset: [0, -44], closeButton: false, className: "ts-popup" })
            .setHTML(`<p style="margin:0;font-size:12px;font-weight:600;color:#2E2A26;white-space:nowrap">${markerLabel}</p>`);
          new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([baseLon, baseLat]).setPopup(popup).addTo(map);
          coreBounds.extend([baseLon, baseLat]);
          coreCount++;
        }

        // ── Connectivity layer (v1 scaffold) ────────────────────────────────
        if (showConnectivity) {
          const connectivityLayerData =
            connectivityGeojson ??
            buildConnectivityMockCells(mapFocusCenter.lat, mapFocusCenter.lon);

          map.addSource(CONNECTIVITY_SOURCE_ID, {
            type: "geojson",
            data: connectivityLayerData,
          });

          map.addLayer({
            id: CONNECTIVITY_FILL_ID,
            type: "fill",
            source: CONNECTIVITY_SOURCE_ID,
            paint: {
              "fill-color": [
                "match",
                ["get", "bucket"],
                "excellent", CONNECTIVITY_BUCKET_META.excellent.fill,
                "good", CONNECTIVITY_BUCKET_META.good.fill,
                "okay", CONNECTIVITY_BUCKET_META.okay.fill,
                CONNECTIVITY_BUCKET_META.risky.fill,
              ],
              "fill-opacity": 0.2,
            },
          });

          map.addLayer({
            id: CONNECTIVITY_LINE_ID,
            type: "line",
            source: CONNECTIVITY_SOURCE_ID,
            paint: {
              "line-color": [
                "match",
                ["get", "bucket"],
                "excellent", CONNECTIVITY_BUCKET_META.excellent.line,
                "good", CONNECTIVITY_BUCKET_META.good.line,
                "okay", CONNECTIVITY_BUCKET_META.okay.line,
                CONNECTIVITY_BUCKET_META.risky.line,
              ],
              "line-width": 1.3,
              "line-opacity": 0.68,
            },
          });

          const parseFeature = (
            feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties> | undefined,
          ): ConnectivityCellData | null => {
            const props = feature?.properties;
            if (!props) return null;
            const score = Number(props.score);
            const bucketRaw = String(props.bucket ?? "");
            if (!Number.isFinite(score)) return null;
            if (
              bucketRaw !== "excellent" &&
              bucketRaw !== "good" &&
              bucketRaw !== "okay" &&
              bucketRaw !== "risky"
            ) return null;
            const confidenceRaw = String(props.confidence ?? "low");
            const confidence: ConfidenceBucket =
              confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
                ? confidenceRaw
                : "low";
            const asNumOrNull = (value: unknown): number | null => {
              const n = Number(value);
              return Number.isFinite(n) ? n : null;
            };
            return {
              id: String(props.id ?? "unknown-cell"),
              score,
              bucket: bucketRaw,
              median_download_mbps: asNumOrNull(props.median_download_mbps),
              median_upload_mbps: asNumOrNull(props.median_upload_mbps),
              median_latency_ms: asNumOrNull(props.median_latency_ms),
              confidence,
              freshness_days: asNumOrNull(props.freshness_days),
              summary_short: String(props.summary_short ?? recommendationForBucket(bucketRaw)),
            };
          };

          map.on("mousemove", CONNECTIVITY_FILL_ID, (event: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            features?: any[];
          }) => {
            map.getCanvas().style.cursor = "pointer";
            const parsed = parseFeature(event.features?.[0]);
            setHoveredConnectivity(parsed);
          });

          map.on("mouseleave", CONNECTIVITY_FILL_ID, () => {
            map.getCanvas().style.cursor = "";
            setHoveredConnectivity(null);
          });

          map.on("click", CONNECTIVITY_FILL_ID, (event: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            features?: any[];
          }) => {
            const parsed = parseFeature(event.features?.[0]);
            if (parsed) setSelectedConnectivity(parsed);
          });
        }

        // ── Layer 2: Place markers (hidden initially when zones exist) ──────
        for (const place of places) {
          const showDetail = isUnlocked || freeSet.has(place.id);
          const el = showDetail
            ? createPlaceMarker(place.category, "normal")
            : createLockedMarker();

          // Hidden by default in zone mode (shown per-zone on drill-in)
          if (hasZones) el.style.display = "none";

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: showDetail ? "bottom" : "center",
          }).setLngLat([place.lon, place.lat]).addTo(map);

          if (showDetail) {
            const ratingStr = place.google?.rating != null ? ` · ★ ${place.google.rating}` : "";
            const popup = new mapboxgl.Popup({ offset: [0, -38], closeButton: false, className: "ts-popup" })
              .setHTML(
                `<p style="margin:0;font-size:12px;font-weight:600;color:#2E2A26">${place.name}</p>
                 <p style="margin:2px 0 0;font-size:11px;color:#5F5A54;text-transform:capitalize">${place.category}${ratingStr}</p>`
              );
            marker.setPopup(popup);
            el.addEventListener("click", () => {
              document.getElementById(`place-${place.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            if (!hasZones) { coreBounds.extend([place.lon, place.lat]); coreCount++; }
          }

          markersRef.current.place.push(marker);
        }

        // ── Daily-life markers (hidden initially in zone mode) ──────────────
        if (isUnlocked) {
          for (const dl of dailyLifePlaces) {
            if (dl.type !== "grocery" && dl.type !== "pharmacy") continue;
            const el = createDailyLifeMarker(dl.type);
            if (hasZones) el.style.display = "none";
            const label = dl.type === "grocery" ? "Grocery" : "Pharmacy";
            const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
              .setLngLat([dl.lon, dl.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: [0, -32], closeButton: false, className: "ts-popup" })
                  .setHTML(
                    `<p style="margin:0;font-size:12px;font-weight:600;color:#2E2A26">${dl.name}</p>
                     <p style="margin:2px 0 0;font-size:11px;color:#5F5A54">${label} · ${dl.distanceKm} km away</p>`
                  )
              )
              .addTo(map);
            markersRef.current.dl.push(marker);
          }
        }

        // ── Fit bounds ───────────────────────────────────────────────────────
        if (coreCount > 0) {
          const boundsObj = coreBounds;
          overviewBoundsRef.current = boundsObj;
          try {
            map.fitBounds(boundsObj, {
              padding: hasZones ? { top: 40, bottom: 56, left: 32, right: 32 } : 60,
              maxZoom: hasZones ? 14 : 15,
              duration: 0,
            });
          } catch { /* single point */ }
        }

        if (shouldAutoDrillSingleZone) {
          const singleZone = interactiveZones[0];
          if (singleZone) {
            window.setTimeout(() => {
              onZoneClickRef.current?.(singleZone);
            }, 140);
          }
        }
      });
    }

    init().catch(console.warn);
    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    baseLat,
    baseLon,
    isUnlocked,
    microAreas,
    showConnectivity,
    mapFocusCenter,
    connectivityGeojson,
  ]);

  if (!token) return null;

  const placeCount = totalPlaces ?? places.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-bark">
          {activeZone
            ? `Inside ${activeZone.name}`
            : hasZones ? "Area comparison" : intent ? "Your base map" : "Routine map"}
        </p>
        <div className="flex items-center gap-2">
          {!activeZone && hasScores && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              {microAreas!.filter((z) => !z.hasConstraintBreakers).length} viable area{microAreas!.filter((z) => !z.hasConstraintBreakers).length !== 1 ? "s" : ""}
            </span>
          )}
          {placeCount > 0 && (
            <span className="rounded-full border border-dune bg-white px-2.5 py-0.5 text-xs text-umber">
              {placeCount} place{placeCount !== 1 ? "s" : ""}
              {!isUnlocked ? " · some locked" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden border border-dune">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: "clamp(300px, 48vw, 460px)" }}
        />

        {/* ── Back button (Layer 2 only) ──────────────────────────────────── */}
        {activeZone && (
          <button
            onClick={flyToOverview}
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur-sm border border-dune px-3 py-2 text-xs font-semibold text-bark shadow-sm hover:bg-cream transition-colors z-10"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All areas
          </button>
        )}

        {/* Connectivity controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <div className="rounded-xl border border-dune bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConnectivity((v) => !v)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  showConnectivity
                    ? "bg-bark text-white"
                    : "bg-white text-umber border border-dune"
                }`}
              >
                Connectivity
              </button>
              <button
                type="button"
                onClick={() => setShowStarlink((v) => !v)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  showStarlink
                    ? "bg-teal text-white"
                    : "bg-white text-umber border border-dune"
                }`}
              >
                Starlink fallback
              </button>
            </div>
          </div>
          {showStarlink && (
            <div className="rounded-xl border border-dune bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-umber">
                Backup signal
              </p>
              <p className="mt-1 text-xs font-medium text-bark">
                {starlinkLabelText ?? starlinkLabel(starlinkStatus)}
              </p>
            </div>
          )}
        </div>

        {/* ── "Tap zone" hint (Layer 1, zones exist) ─────────────────────── */}
        {!activeZone && hasZones && !shouldAutoDrillSingleZone && (
          <div className="absolute top-3 left-3 rounded-lg bg-white/90 backdrop-blur-sm border border-dune px-2.5 py-1.5">
            <p className="text-[10px] text-umber">
              <span className="hidden sm:inline">Click</span>
              <span className="sm:hidden">Tap</span>
              {" "}a zone to explore places inside it
            </p>
          </div>
        )}

        {/* Connectivity hover chip */}
        {showConnectivity && hoveredConnectivity && (
          <div className="pointer-events-none absolute left-3 top-16 z-10 rounded-lg border border-dune bg-white/95 px-2.5 py-1.5 shadow-sm">
            <p className="text-[11px] font-semibold text-bark">
              Connectivity {hoveredConnectivity.score}/100
            </p>
            <p className="mt-0.5 text-[10px] text-umber">
              {CONNECTIVITY_BUCKET_META[hoveredConnectivity.bucket].label} · {hoveredConnectivity.median_download_mbps ?? "—"}↓ / {hoveredConnectivity.median_upload_mbps ?? "—"}↑ Mbps · {hoveredConnectivity.median_latency_ms ?? "—"} ms
            </p>
          </div>
        )}

        {/* ── Zone detail legend (Layer 2) ────────────────────────────────── */}
        {activeZone && (
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2 max-w-[calc(100%-24px)]">
            <LegendDot color={MAP_COLORS.work} label="Work" />
            <LegendDot color={MAP_COLORS.coffee} label="Coffee & meals" />
            <LegendDot color={MAP_COLORS.wellbeing} label="Wellbeing" />
            {isUnlocked && dailyLifePlaces.some((d) => d.type === "grocery") && (
              <LegendDot color={MAP_COLORS.grocery} label="Grocery" />
            )}
            {isUnlocked && dailyLifePlaces.some((d) => d.type === "pharmacy") && (
              <LegendDot color={MAP_COLORS.pharmacy} label="Pharmacy" />
            )}
            {!isUnlocked && <LegendDot color={MAP_COLORS.locked} label="Locked" />}
          </div>
        )}

        {/* ── Zone overview legend (Layer 1) ──────────────────────────────── */}
        {!activeZone && (
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-dune bg-white/90 backdrop-blur-sm px-3 py-2 max-w-[calc(100%-24px)]">
            {hasZones ? (
              <>
                {hasScores ? (
                  <>
                    <ZoneLegendDot color="#16a34a" label="Top pick" />
                    <ZoneLegendDot color="#d97706" label="Runner-up" />
                    <ZoneLegendDot color="#9ca3af" label="Not viable" dashed />
                  </>
                ) : (
                  <>
                    <ZoneLegendDot color="#6366f1" label="Neighborhood zone" />
                    <span className="text-[10px] text-umber opacity-70">Set profile to rank</span>
                  </>
                )}
              </>
            ) : (
              <>
                <LegendDot color={MAP_COLORS.work} label="Work" />
                <LegendDot color={MAP_COLORS.coffee} label="Coffee & meals" />
                <LegendDot color={MAP_COLORS.wellbeing} label="Wellbeing" />
                {isUnlocked && dailyLifePlaces.some((d) => d.type === "grocery") && (
                  <LegendDot color={MAP_COLORS.grocery} label="Grocery" />
                )}
                {isUnlocked && dailyLifePlaces.some((d) => d.type === "pharmacy") && (
                  <LegendDot color={MAP_COLORS.pharmacy} label="Pharmacy" />
                )}
                {!isUnlocked && <LegendDot color={MAP_COLORS.locked} label="Locked" />}
              </>
            )}
          </div>
        )}

        {/* Connectivity legend */}
        {showConnectivity && (
          <div className="absolute bottom-3 right-3 z-10 rounded-xl border border-dune bg-white/90 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-umber">
              Connectivity
            </p>
            <div className="mt-1.5 flex items-center gap-2.5">
              <ConnectivityLegendDot bucket="excellent" />
              <ConnectivityLegendDot bucket="good" />
              <ConnectivityLegendDot bucket="okay" />
              <ConnectivityLegendDot bucket="risky" />
            </div>
          </div>
        )}

        {/* Connectivity detail panel */}
        {showConnectivity && selectedConnectivity && (
          <div className="absolute right-3 top-24 z-10 w-[280px] rounded-xl border border-dune bg-white/95 p-3 shadow-md backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-bark">
                Connectivity score {selectedConnectivity.score}/100
              </p>
              <button
                type="button"
                onClick={() => setSelectedConnectivity(null)}
                className="rounded-md border border-dune px-2 py-0.5 text-[10px] font-semibold text-umber hover:text-bark"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-xs font-medium text-umber">
              {CONNECTIVITY_BUCKET_META[selectedConnectivity.bucket].label}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-bark">
              <span>Download</span><span>{selectedConnectivity.median_download_mbps ?? "—"} Mbps</span>
              <span>Upload</span><span>{selectedConnectivity.median_upload_mbps ?? "—"} Mbps</span>
              <span>Latency</span><span>{selectedConnectivity.median_latency_ms ?? "—"} ms</span>
              <span>Confidence</span><span className="capitalize">{selectedConnectivity.confidence}</span>
              <span>Freshness</span><span>{selectedConnectivity.freshness_days ?? "—"} days</span>
            </div>
            <p className="mt-2 text-[11px] text-umber">
              {selectedConnectivity.summary_short}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend helpers ────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="9" height="12" viewBox="0 0 9 12" className="flex-shrink-0">
        <path d="M4.5 0C2 0 0 2 0 4.5c0 3.5 4.5 7.5 4.5 7.5S9 8 9 4.5C9 2 7 0 4.5 0z" fill={color} />
      </svg>
      <span className="text-[10px] leading-none text-umber">{label}</span>
    </div>
  );
}

function ZoneLegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
        <circle cx="7" cy="7" r="5.5"
          fill={color} fillOpacity={0.15}
          stroke={color} strokeWidth="1.5" strokeOpacity={0.7}
          strokeDasharray={dashed ? "2 1.5" : undefined}
        />
      </svg>
      <span className="text-[10px] leading-none text-umber">{label}</span>
    </div>
  );
}

function ConnectivityLegendDot({ bucket }: { bucket: ConnectivityBucket }) {
  const meta = CONNECTIVITY_BUCKET_META[bucket];
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-[3px]"
        style={{ background: meta.fill }}
      />
      <span className="text-[10px] text-umber">{meta.label}</span>
    </div>
  );
}
