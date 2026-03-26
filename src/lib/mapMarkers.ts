/**
 * Shared Mapbox GL JS marker factory functions.
 * Used by both CityMap (city pages) and HeroMap (landing hero).
 * All functions are browser-only — only call inside useEffect.
 */

// ── Brand colors ─────────────────────────────────────────────────────────────

export const MAP_COLORS = {
  work:      "#8FB7B3",  // teal
  coffee:    "#C07A58",  // terracotta
  wellbeing: "#B99B6B",  // warm amber
  base:      "#2E2A26",  // bark (darkest)
  locked:    "#C8C3BC",  // dune (muted)
} as const;

// ── SVG icons (14×14 viewBox, white strokes/fills) ───────────────────────────

export const MAP_ICONS = {
  work: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="white" stroke-width="1.5"/>
  <path d="M0 12h14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  coffee: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 5h8v5a3 3 0 01-3 3H5a3 3 0 01-3-3V5z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10 6h1a1.5 1.5 0 010 3h-1" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M4 3c0-1 1.5-1 1.5-2M7.5 3c0-1 1.5-1 1.5-2" stroke="white" stroke-width="1" stroke-linecap="round"/>
</svg>`,

  // Stick figure with arms raised — gym / yoga / sports
  wellbeing: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="7" cy="2.5" r="1.5" fill="white"/>
  <line x1="7" y1="4" x2="7" y2="9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="4" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="10" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="5" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="9" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  base: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 1l1.6 3.3L14 5.1l-3 2.9.7 4.1L8 10.4l-3.7 1.7.7-4.1L2 5.1l4.4-.8L8 1z" fill="white"/>
</svg>`,
} as const;

// ── Marker element factories ──────────────────────────────────────────────────

/** Large dark star marker for the suggested base area. */
export function createBaseMarker(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "40px",
    height: "40px",
    background: MAP_COLORS.base,
    borderRadius: "50%",
    border: "3px solid white",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
  });
  el.innerHTML = MAP_ICONS.base;
  return el;
}

/** Colored circle with category icon for an unlocked/visible place. */
export function createPlaceMarker(category: string): HTMLElement {
  const color =
    category === "coworking" ? MAP_COLORS.work :
    category === "cafe"      ? MAP_COLORS.work :
    category === "food"      ? MAP_COLORS.coffee :
    category === "gym"       ? MAP_COLORS.wellbeing :
    // hero demo categories
    category === "work"      ? MAP_COLORS.work :
    category === "coffee"    ? MAP_COLORS.coffee :
    category === "wellbeing" ? MAP_COLORS.wellbeing :
    MAP_COLORS.work;

  const icon =
    (category === "food" || category === "coffee") ? MAP_ICONS.coffee :
    (category === "gym"  || category === "wellbeing") ? MAP_ICONS.wellbeing :
    MAP_ICONS.work;

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

/** Small grey dot for locked (paywalled) places. */
export function createLockedMarker(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "12px",
    height: "12px",
    background: MAP_COLORS.locked,
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
    cursor: "pointer",
  });
  return el;
}
