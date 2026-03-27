/**
 * Shared Mapbox GL JS marker factory functions.
 * Used by CityMap, HeroMap, and CurationTool.
 * All functions are browser-only — only call inside useEffect.
 *
 * Pin design: teardrop SVGs with white icons inside.
 * pointer-events:none on SVG prevents child elements from firing mouseleave
 * on the wrapper div (which caused the "pin disappears on hover" bug).
 */

// ── Brand colors ─────────────────────────────────────────────────────────────

export const MAP_COLORS = {
  work:      "#8FB7B3",  // teal
  coffee:    "#C07A58",  // terracotta
  wellbeing: "#B99B6B",  // warm amber
  base:      "#2E2A26",  // bark — reserved for base area marker
  locked:    "#C8C3BC",  // dune (muted dots)
} as const;

// ── SVG icons (14×14 viewBox, white strokes/fills) ───────────────────────────

export const MAP_ICONS = {
  // Laptop screen — work / coworking
  work: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="white" stroke-width="1.5"/>
  <path d="M0 12h14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  // Coffee cup — café / food
  coffee: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 5h8v5a3 3 0 01-3 3H5a3 3 0 01-3-3V5z" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M10 6h1a1.5 1.5 0 010 3h-1" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M4 3c0-1 1.5-1 1.5-2M7.5 3c0-1 1.5-1 1.5-2" stroke="white" stroke-width="1" stroke-linecap="round"/>
</svg>`,

  // Stick figure arms raised — gym / yoga / wellbeing
  wellbeing: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="7" cy="2.5" r="1.5" fill="white"/>
  <line x1="7" y1="4" x2="7" y2="9" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="4" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="6" x2="10" y2="4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="5" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="7" y1="9" x2="9" y2="13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  // House / home — base area marker
  base: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 7.5L8 2L14 7.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 6.5V13H12V6.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="6" y="9.5" width="4" height="3.5" rx="0.5" stroke="white" stroke-width="1.5"/>
</svg>`,
} as const;

// ── Teardrop SVG factory ──────────────────────────────────────────────────────
// All SVGs have pointer-events:none so child elements never fire mouseleave on
// the wrapper div (prevents the "hover flicker / pin disappears" bug).

function pinSVG(
  color: string,
  iconHTML: string,
  w: number,
  h: number,
  iconOffset: { x: number; y: number }
): string {
  const cx = w / 2;
  // Teardrop path: circle top, pointed tail at bottom
  const r = cx;
  const path = `M${cx} 0C${(cx - r * 0.61).toFixed(1)} 0 0 ${(r * 0.61).toFixed(1)} 0 ${r}C0 ${(r * 1.55).toFixed(1)} ${cx} ${h} ${cx} ${h}S${w} ${(r * 1.55).toFixed(1)} ${w} ${r}C${w} ${(r * 0.61).toFixed(1)} ${(cx + r * 0.61).toFixed(1)} 0 ${cx} 0z`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.18))">
  <path d="${path}" fill="${color}"/>
  <g transform="translate(${iconOffset.x},${iconOffset.y})">${iconHTML}</g>
</svg>`;
}

// ── Marker element factories ──────────────────────────────────────────────────

/**
 * Base area marker — bark teardrop with home icon.
 * Larger than place markers to stand out as the "suggested stay area".
 * Use anchor: "bottom" in Mapbox Marker options.
 */
export function createBaseMarker(): HTMLElement {
  const el = document.createElement("div");
  el.style.cursor = "default";
  el.style.width = "30px";
  el.style.height = "40px";
  el.style.transformOrigin = "center bottom";
  el.innerHTML = pinSVG(MAP_COLORS.base, MAP_ICONS.base, 30, 40, { x: 7, y: 7 });
  return el;
}

/**
 * Colored teardrop with category icon for an unlocked/visible place.
 * Use anchor: "bottom" in Mapbox Marker options so the pin tip is precise.
 */
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
  el.style.cursor = "pointer";
  el.style.width = "26px";
  el.style.height = "34px";
  el.style.transformOrigin = "center bottom";
  el.innerHTML = pinSVG(color, icon, 26, 34, { x: 6, y: 6 });
  return el;
}

/** Small grey dot for locked (paywalled) places. Keeps subtle/unobtrusive. */
export function createLockedMarker(): HTMLElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width: "10px",
    height: "10px",
    background: MAP_COLORS.locked,
    borderRadius: "50%",
    border: "2px solid white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    cursor: "pointer",
    flexShrink: "0",
  });
  return el;
}
