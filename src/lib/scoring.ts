import type {
  Place,
  CitySummary,
  StayIntent,
  StayPurpose,
  FitProfile,
  DailyLifePlace,
  StayFitResult,
  StayScoreVector,
} from "@/types";
import { haversineKm } from "./overpass";

/**
 * Compute the centroid of all cafes and coworkings in the place list.
 * This is used as the "suggested base area" reference point for distance
 * calculations — more actionable than the raw geocoded city centre because
 * it reflects where work infrastructure actually clusters.
 *
 * Returns null if fewer than 3 work places exist (caller falls back to
 * city centre or omits the distance field).
 */
/** Max distance from the weighted centroid for a place to count in pass 2. */
const CENTROID_OUTLIER_KM = 1.5;
/** If computed centroid drifts further than this from the geocoded city center, fall back */
const MAX_CENTROID_DRIFT_KM = 3.0;

/**
 * Work-potential weight for centroid calculation.
 *
 * The base area should be wherever the best remote-work options are,
 * not just wherever most places cluster. This weight reflects that:
 *
 *   category base:
 *     coworking        → 10  (strongest signal for remote workers)
 *     work-fit cafe    → 5   (cafe with clear work signals)
 *     enriched cafe    → 3   (has Google data, usable but unclear work fit)
 *     OSM-only cafe    → 1   (minimal signal)
 *
 *   workFit bonus:     high +4 / medium +2 / low 0
 *   wifi bonus:        verified +3 / medium +1
 *   rating multiplier: scales the full score by 1.0–2.0 based on Google rating
 *                      no rating → neutral 1.0
 */
function centroidWeight(p: Place): number {
  // Base by category + work signals
  let base: number;
  if (p.category === "coworking") {
    base = 10;
  } else if (p.confidence.workFit === "high") {
    base = 5;
  } else if (p.google) {
    base = 3;
  } else {
    base = 1;
  }

  // workFit bonus
  const workFitBonus =
    p.confidence.workFit === "high" ? 4 :
    p.confidence.workFit === "medium" ? 2 : 0;

  // wifi bonus
  const wifiBonus =
    p.confidence.wifiConfidence === "verified" ? 3 :
    p.confidence.wifiConfidence === "medium" ? 1 : 0;

  // rating multiplier (1.0 if no rating, up to 2.0 for ★5)
  const rating = p.google?.rating ?? p.rating;
  const ratingMult = rating ? Math.min(Math.max(rating / 5 * 2, 1.0), 2.0) : 1.0;

  return (base + workFitBonus + wifiBonus) * ratingMult;
}

export function computeBaseCentroid(
  places: Place[],
  cityLat?: number,
  cityLon?: number
): { lat: number; lon: number } | null {
  const workPlaces = places.filter(
    (p) => p.category === "cafe" || p.category === "coworking"
  );
  if (workPlaces.length < 3) return null;

  // Pass 1: weighted centroid anchored near the geocoded city center.
  // Only use places within MAX_CENTROID_DRIFT_KM of the city center so that
  // Google-only places from nearby towns (e.g. Las Salinas for Popoyo) don't
  // pull the centroid away from the actual destination.
  const anchored =
    cityLat !== undefined && cityLon !== undefined
      ? workPlaces.filter(
          (p) => haversineKm(cityLat, cityLon, p.lat, p.lon) <= MAX_CENTROID_DRIFT_KM
        )
      : workPlaces;
  const pool1 = anchored.length >= 2 ? anchored : workPlaces;

  const totalWeight1 = pool1.reduce((s, p) => s + centroidWeight(p), 0);
  const roughLat = pool1.reduce((s, p) => s + p.lat * centroidWeight(p), 0) / totalWeight1;
  const roughLon = pool1.reduce((s, p) => s + p.lon * centroidWeight(p), 0) / totalWeight1;

  // Pass 2: drop outliers > CENTROID_OUTLIER_KM from the weighted centroid
  const cluster = pool1.filter(
    (p) => haversineKm(roughLat, roughLon, p.lat, p.lon) <= CENTROID_OUTLIER_KM
  );
  const finalPlaces = cluster.length >= 2 ? cluster : pool1;

  // Final weighted average using only the cluster
  const totalWeight2 = finalPlaces.reduce((s, p) => s + centroidWeight(p), 0);
  const lat = finalPlaces.reduce((s, p) => s + p.lat * centroidWeight(p), 0) / totalWeight2;
  const lon = finalPlaces.reduce((s, p) => s + p.lon * centroidWeight(p), 0) / totalWeight2;
  return { lat, lon };
}

// Per .cursor/rules/01-recommended-area-logic.mdc:
// centroid requires at least this many total places across all categories.
const MIN_PLACES_FOR_CENTROID = 5;

// Each sub-score is capped below 1.0 to avoid implying certainty.
// Even with abundant data we can only say "likely good", not "perfect".
const SCORE_CERTAINTY_CAP = 0.85;

// Thresholds are intentionally high — a well-served city should reach ~70-82,
// not 100. Hitting the cap requires genuine density, not just a few spots.
const THRESHOLDS = {
  cafe: 15,
  coworking: 4,
  gym: 4,
  food: 15,
};

function cappedRatio(count: number, threshold: number): number {
  return Math.min(count / threshold, SCORE_CERTAINTY_CAP);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function computeCitySummary(
  city: { name: string; lat: number; lon: number },
  places: Place[],
  areaName?: string
): CitySummary {
  const cafes = places.filter((p) => p.category === "cafe");
  const coworkings = places.filter((p) => p.category === "coworking");
  const gyms = places.filter((p) => p.category === "gym");
  const food = places.filter((p) => p.category === "food");

  // Each category contributes up to 25 × SCORE_CERTAINTY_CAP ≈ 21 points.
  // Total max ≈ 85. A score of 100 is intentionally unreachable.
  const cafeScore = cappedRatio(cafes.length, THRESHOLDS.cafe) * 25;
  const coworkScore = cappedRatio(coworkings.length, THRESHOLDS.coworking) * 25;
  const gymScore = cappedRatio(gyms.length, THRESHOLDS.gym) * 25;
  const foodScore = cappedRatio(food.length, THRESHOLDS.food) * 25;
  const routineScore = Math.round(cafeScore + coworkScore + gymScore + foodScore);

  // Build dynamic summary from actual category counts instead of static strings.
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (cafes.length >= 5) strengths.push("good café density");
  else if (cafes.length >= 2) strengths.push("some café options");
  else gaps.push("few cafés");

  if (coworkings.length >= 2) strengths.push("coworking options available");
  else if (coworkings.length === 1) strengths.push("a coworking nearby");
  else gaps.push("no coworkings found");

  if (gyms.length >= 2) strengths.push("gym access nearby");
  else if (gyms.length === 1) strengths.push("a gym option nearby");
  else gaps.push("limited gym options");

  if (food.length >= 5) strengths.push("multiple food options");
  else if (food.length >= 2) strengths.push("some food spots");
  else gaps.push("few food spots");

  let summaryText: string;
  if (strengths.length >= 3 && gaps.length === 0) {
    const s = strengths.slice(0, 3);
    summaryText = `${capitalize(s[0])}, ${s[1]}, and ${s[2]}. Well-supported for a remote-work routine.`;
  } else if (strengths.length >= 2 && gaps.length <= 1) {
    const s = strengths.slice(0, 2);
    const g = gaps[0];
    summaryText = g
      ? `${capitalize(s[0])} and ${s[1]}. ${capitalize(g)} in this area.`
      : `${capitalize(s[0])} and ${s[1]}. Decent setup for a remote-work stay.`;
  } else if (strengths.length >= 1) {
    const g = gaps.slice(0, 2).join(", ");
    summaryText = `${capitalize(strengths[0])}. ${capitalize(g)} — worth factoring into your setup.`;
  } else {
    summaryText =
      "Very limited data for this area. Hard to assess routine support — explore from the center.";
  }

  const confidence: CitySummary["confidence"] =
    routineScore >= 60 ? "high" : routineScore >= 35 ? "medium" : "low";

  // Recommended area logic per cursor rule 01:
  // sparse data → generic label with low-confidence disclaimer
  if (places.length < MIN_PLACES_FOR_CENTROID) {
    return {
      routineScore,
      summaryText,
      recommendedArea: "Central area",
      confidence: "low",
      areaReason:
        "Limited place data. This is a general suggestion — explore from the center.",
    };
  }

  // Use the reverse-geocoded neighbourhood name when available; fall back to
  // "Central {city}" which is still more readable than raw coordinates.
  const recommendedArea =
    areaName && areaName.trim().length > 0
      ? areaName
      : `Central ${city.name}`;

  // Generate a reason sentence based on what actually clusters near this zone.
  let areaReason: string;
  if (coworkings.length >= 2 && cafes.length >= 5) {
    areaReason =
      "Coworkings and several work-friendly cafés are within walking distance of this zone.";
  } else if (coworkings.length >= 1 && cafes.length >= 3) {
    areaReason =
      "A coworking and work-friendly cafés cluster near this area.";
  } else if (cafes.length >= 8) {
    areaReason =
      "Most work-friendly cafés cluster within this zone — a practical base for café workers.";
  } else if (cafes.length >= 3) {
    areaReason =
      "Work spots and cafés seem to concentrate around this area.";
  } else {
    areaReason =
      "Based on available data — coverage for this city is limited.";
  }

  return { routineScore, summaryText, recommendedArea, confidence, areaReason };
}

// ── Stay fit scoring ──────────────────────────────────────────────────────────

const ACTIVITY_PURPOSES: StayPurpose[] = ["surf", "dive", "hike", "yoga", "kite"];

/**
 * Profile weight vectors.
 * purpose weight is real — in milestone 1 it's always null so the weight
 * redistributes proportionally between work and life.
 */
const PROFILE_WEIGHTS: Record<FitProfile, { work: number; purpose: number; dailyLife: number }> = {
  activity_light_work:    { work: 0.25, purpose: 0.35, dailyLife: 0.40 },
  activity_balanced_work: { work: 0.40, purpose: 0.25, dailyLife: 0.35 },
  work_primary:           { work: 0.55, purpose: 0.10, dailyLife: 0.35 },
  generic:                { work: 0.40, purpose: 0.20, dailyLife: 0.40 },
};

/**
 * Work sub-weights per profile.
 * Each row sums to 1.0 so the raw score stays in 0–100 range.
 * The key product insight: activity profiles downweight coworking (one is enough)
 * and upweight café quality, because light workers depend on cafés, not desks.
 */
const WORK_SUBWEIGHTS: Record<FitProfile, {
  coworking: number;
  highWorkFitCafe: number;
  wifiConfidence: number;
  noiseRisk: number;
}> = {
  activity_light_work:    { coworking: 0.10, highWorkFitCafe: 0.55, wifiConfidence: 0.20, noiseRisk: 0.15 },
  activity_balanced_work: { coworking: 0.35, highWorkFitCafe: 0.35, wifiConfidence: 0.20, noiseRisk: 0.10 },
  work_primary:           { coworking: 0.50, highWorkFitCafe: 0.25, wifiConfidence: 0.15, noiseRisk: 0.10 },
  generic:                { coworking: 0.40, highWorkFitCafe: 0.35, wifiConfidence: 0.15, noiseRisk: 0.10 },
};

/**
 * Resolve the scoring profile from intent.
 *
 * dailyBalance is the primary signal for activity users:
 *   - work_first  → work_primary  (base optimised for work; activity is secondary)
 *   - purpose_first → activity_light_work (base optimised for activity regardless of hours)
 *   - balanced    → workStyle determines the profile (light → light_work, otherwise balanced)
 *
 * This fixes a prior bug where a surf user with workStyle=heavy got work_primary — meaning
 * their base was recommended for coworking density rather than surf proximity.
 * A surfer with heavy work hours + purpose_first daily balance still wants a surf-first base.
 */
function resolveProfile(intent: StayIntent): FitProfile {
  if (intent.purpose === "work_first") return "work_primary";
  if (intent.purpose === "exploring") return "generic";
  if (!ACTIVITY_PURPOSES.includes(intent.purpose)) return "generic";

  const balance = intent.dailyBalance ?? "balanced";

  if (balance === "work_first") return "work_primary";
  if (balance === "purpose_first") return "activity_light_work";

  // balanced: workStyle decides between the two activity profiles
  return intent.workStyle === "light" ? "activity_light_work" : "activity_balanced_work";
}

function computeWorkFitScore(places: Place[], profile: FitProfile): number {
  const coworkings = places.filter((p) => p.category === "coworking");
  const highWorkFitCafes = places.filter(
    (p) => p.category === "cafe" && p.confidence.workFit === "high"
  );
  const wifiVerified = places.filter(
    (p) =>
      (p.category === "cafe" || p.category === "coworking") &&
      p.confidence.wifiConfidence === "verified"
  );
  const lowNoise = places.filter(
    (p) =>
      (p.category === "cafe" || p.category === "coworking") &&
      p.confidence.noiseRisk === "low"
  );

  const w = WORK_SUBWEIGHTS[profile];
  const raw =
    cappedRatio(coworkings.length, 4)       * w.coworking       * 100 +
    cappedRatio(highWorkFitCafes.length, 8) * w.highWorkFitCafe * 100 +
    cappedRatio(wifiVerified.length, 5)     * w.wifiConfidence  * 100 +
    cappedRatio(lowNoise.length, 5)         * w.noiseRisk       * 100;

  return Math.round(Math.min(raw, 95));
}

function computeDailyLifeScore(
  places: Place[],
  dailyLife: DailyLifePlace[]
): {
  score: number;
  breakdown: { foodSustainability: number; groceryAccess: number; pharmacyAccess: number };
  redFlags: string[];
} {
  const foodNearby = places.filter(
    (p) => (p.category === "food" || p.category === "cafe") && (p.distanceKm ?? 99) < 1.5
  );
  const groceryNearby = dailyLife.filter(
    (d) => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 1.5
  );
  const pharmacyNearby = dailyLife.filter((d) => d.type === "pharmacy" && d.distanceKm < 2.0);

  const foodSustainability = Math.round(cappedRatio(foodNearby.length, 12) * 100);
  const groceryAccess      = Math.round(cappedRatio(groceryNearby.length, 2) * 100);
  const pharmacyAccess     = Math.round(Math.min(pharmacyNearby.length, 1) * 100);

  const score = Math.round(
    foodSustainability * 0.45 +
    groceryAccess      * 0.35 +
    pharmacyAccess     * 0.20
  );

  const redFlags: string[] = [];
  // Both missing → combine into one clear message instead of two separate flags
  if (groceryNearby.length === 0 && pharmacyNearby.length === 0) {
    redFlags.push(
      "No grocery or pharmacy found near the base — daily logistics will require planning and likely a scooter or car."
    );
  } else {
    if (groceryNearby.length === 0) {
      redFlags.push(
        "No grocery store found near the base — daily shopping will require transport."
      );
    }
    if (pharmacyNearby.length === 0) {
      redFlags.push(
        "No pharmacy found within 2km — worth planning for stays longer than a week."
      );
    }
  }
  if (foodNearby.length < 3) {
    redFlags.push(
      "Limited food options near the base — meal variety will require extra planning."
    );
  }

  return { score, breakdown: { foodSustainability, groceryAccess, pharmacyAccess }, redFlags };
}

/**
 * Compute a personalized stay fit score for a city given the user's intent.
 *
 * Returns a StayFitResult with:
 * - fitScore: the weighted composite (changes by profile)
 * - scoreVector: raw, profile-independent signals for future similarity search
 * - redFlags: deterministic warnings based on data gaps
 * - narrativeInputs: structured data for the LLM narrative layer (milestone 3)
 */
export function computeStayFitScore(
  places: Place[],
  dailyLife: DailyLifePlace[],
  city: { name: string; lat: number; lon: number },
  intent: StayIntent,
  areaName?: string
): StayFitResult {
  const profile = resolveProfile(intent);
  const profileWeights = PROFILE_WEIGHTS[profile];

  // ── Component scores ───────────────────────────────────────────────────────
  const workFit = computeWorkFitScore(places, profile);
  const { score: dailyLifeFit, breakdown: dailyLifeDetail, redFlags: lifeFlags } =
    computeDailyLifeScore(places, dailyLife);

  // purposeFit is null until milestone 2 (activity OSM query).
  // Null is honest — we don't fabricate a score we can't compute.
  const purposeFit: number | null = null;
  const purposeAccessLevel = "unknown" as const;
  const purposeAccessNote =
    ACTIVITY_PURPOSES.includes(intent.purpose)
      ? `${intent.purpose} infrastructure data not yet available — verify locally.`
      : null;

  // ── Weighted composite ─────────────────────────────────────────────────────
  // When purposeFit is null, redistribute purpose weight proportionally
  // so the total still sums to 1 and the score stays meaningful.
  const totalKnownWeight = profileWeights.work + profileWeights.dailyLife;
  const effectiveWork = purposeFit === null
    ? profileWeights.work / totalKnownWeight
    : profileWeights.work;
  const effectiveLife = purposeFit === null
    ? profileWeights.dailyLife / totalKnownWeight
    : profileWeights.dailyLife;

  const fitScore = Math.round(workFit * effectiveWork + dailyLifeFit * effectiveLife);

  // ── Work red flags ─────────────────────────────────────────────────────────
  const coworkings = places.filter((p) => p.category === "coworking");
  const allWorkPlaces = places.filter(
    (p) => p.category === "coworking" || p.category === "cafe"
  );
  const wifiVerified = allWorkPlaces.filter(
    (p) => p.confidence.wifiConfidence === "verified"
  );

  const workFlags: string[] = [];
  if (profile === "work_primary" && coworkings.length === 0) {
    workFlags.push(
      "No dedicated coworking found — you'll depend entirely on cafés for focused work sessions."
    );
  }
  if (
    (profile === "work_primary" || profile === "activity_balanced_work") &&
    wifiVerified.length === 0 &&
    allWorkPlaces.length > 0
  ) {
    workFlags.push(
      "No verified wifi across available work spots — confirm connection quality before committing."
    );
  }

  const redFlags = [...workFlags, ...lifeFlags];

  // ── Data gaps (non-blocking notices, not red flags) ────────────────────────
  const dataGaps: string[] = [];
  if (places.length < 5) {
    dataGaps.push("Very few places found — coverage is limited for this area.");
  }
  if (dailyLife.length === 0) {
    dataGaps.push("Daily-life infrastructure data not available from OpenStreetMap.");
  }
  if (purposeAccessNote) dataGaps.push(purposeAccessNote);

  // ── Top places for display + map ───────────────────────────────────────────
  const topWorkPlaces = [...places]
    .filter((p) => p.category === "coworking" || p.category === "cafe")
    .sort((a, b) => {
      // Profile-aware ordering: coworkings first for work-heavy profiles
      if (profile === "work_primary" || profile === "activity_balanced_work") {
        const aScore =
          a.category === "coworking" ? 10 :
          a.confidence.workFit === "high" ? 5 : 1;
        const bScore =
          b.category === "coworking" ? 10 :
          b.confidence.workFit === "high" ? 5 : 1;
        if (aScore !== bScore) return bScore - aScore;
      }
      return (a.distanceFromBasekm ?? a.distanceKm ?? 99) -
             (b.distanceFromBasekm ?? b.distanceKm ?? 99);
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      distanceFromBasekm: p.distanceFromBasekm ?? null,
      lat: p.lat,
      lon: p.lon,
    }));

  const topDailyLifePlaces = dailyLife
    .filter((d) => d.type === "grocery" || d.type === "pharmacy")
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4)
    .map((d) => ({
      type: d.type,
      name: d.name,
      distanceKm: d.distanceKm,
      lat: d.lat,
      lon: d.lon,
    }));

  // ── Score vector (profile-independent, for future similarity search) ───────
  const coworkingDensity = Math.round(cappedRatio(coworkings.length, 4) * 100);
  const highWorkCafes = places.filter(
    (p) => p.category === "cafe" && p.confidence.workFit === "high"
  );
  const cafeDensity = Math.round(cappedRatio(highWorkCafes.length, 8) * 100);
  // Use generic profile weights for the vector's workFit so it's comparable across cities
  const genericWorkFit = computeWorkFitScore(places, "generic");

  const scoreVector: StayScoreVector = {
    workFit: genericWorkFit,
    dailyLifeFit,
    foodSupport: dailyLifeDetail.foodSustainability,
    groceryAccess: dailyLifeDetail.groceryAccess,
    pharmacyAccess: dailyLifeDetail.pharmacyAccess,
    coworkingDensity,
    cafeDensity,
  };

  // ── Output metadata ────────────────────────────────────────────────────────
  const baseArea = areaName?.trim() || `Central ${city.name}`;

  const confidence: StayFitResult["confidence"] =
    fitScore >= 60 && redFlags.length === 0 ? "high" :
    fitScore >= 35 ? "medium" : "low";

  const fitLabel: StayFitResult["fitLabel"] =
    fitScore >= 65 ? "Strong" :
    fitScore >= 40 ? "Moderate" :
    fitScore >= 20 ? "Limited" : "Unknown";

  // ── Narrative inputs for LLM (milestone 3) ────────────────────────────────
  const groceryNearby = dailyLife.filter(
    (d) => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 1.5
  );
  const pharmacyNearby = dailyLife.filter((d) => d.type === "pharmacy" && d.distanceKm < 2.0);
  const nearestPharmacy = pharmacyNearby.sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const workInfrastructureSummary =
    coworkings.length > 0
      ? `${coworkings.length} coworking${coworkings.length > 1 ? "s" : ""} + ${highWorkCafes.length} high-work-fit café${highWorkCafes.length !== 1 ? "s" : ""}`
      : `${highWorkCafes.length} high-work-fit café${highWorkCafes.length !== 1 ? "s" : ""}, no dedicated coworking`;

  const dailyLifeSummary =
    groceryNearby.length > 0 || pharmacyNearby.length > 0
      ? [
          groceryNearby.length > 0
            ? `${groceryNearby.length} grocery option${groceryNearby.length > 1 ? "s" : ""} within 1.5km`
            : null,
          nearestPharmacy
            ? `pharmacy at ${nearestPharmacy.distanceKm}km`
            : null,
        ]
          .filter(Boolean)
          .join(", ")
      : "No grocery or pharmacy found near the base";

  return {
    profile,
    baseArea,
    fitScore,
    fitLabel,
    confidence,
    scoreBreakdown: {
      workFit,
      purposeFit,
      dailyLifeFit,
      dailyLifeDetail,
    },
    scoreVector,
    purposeAccessLevel,
    purposeAccessNote,
    redFlags,
    dataGaps,
    topWorkPlaces,
    topDailyLifePlaces,
    narrativeInputs: {
      profile,
      purpose: intent.purpose,
      workStyle: intent.workStyle,
      dailyBalance: intent.dailyBalance ?? "balanced",
      baseAreaName: baseArea,
      workInfrastructureSummary,
      dailyLifeSummary,
      purposeAccessSummary: null,
      activeRedFlags: redFlags,
      topWorkPlaceNames: topWorkPlaces.map((p) => {
        const dist = p.distanceFromBasekm;
        const distStr = dist !== null && dist !== undefined ? ` (${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`})` : "";
        return `${p.name}${distStr}`;
      }),
      topCafeAndFoodNames: places
        .filter((p) => p.category === "cafe" || p.category === "food")
        .sort((a, b) => (a.distanceFromBasekm ?? a.distanceKm ?? 99) - (b.distanceFromBasekm ?? b.distanceKm ?? 99))
        .slice(0, 6)
        .map((p) => {
          const dist = p.distanceFromBasekm ?? p.distanceKm;
          const distStr = dist !== undefined ? `, ${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}` : "";
          return `${p.name} (${p.category}${distStr})`;
        }),
      dailyLifeDetails: dailyLife
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 6)
        .map((d) => {
          const distStr = d.distanceKm < 1 ? `${Math.round(d.distanceKm * 1000)}m` : `${d.distanceKm.toFixed(1)}km`;
          return `${d.name} (${d.type}, ${distStr})`;
        }),
    },
  };
}

/**
 * Append daily-life gap signals to an algorithmic CitySummary.
 * Called for ALL users (no intent required) so the generic output
 * honestly surfaces infrastructure gaps even without personalization.
 *
 * Does not mutate — returns a new CitySummary.
 * Only modifies summaryText when gaps are found; leaves everything else intact.
 */
export function appendDailyLifeSignals(
  summary: CitySummary,
  dailyLife: DailyLifePlace[]
): CitySummary {
  if (dailyLife.length === 0) return summary;

  const groceryNearby = dailyLife.filter(
    (d) => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 2.0
  );
  const pharmacyNearby = dailyLife.filter((d) => d.type === "pharmacy" && d.distanceKm < 2.5);

  const gaps: string[] = [];
  if (groceryNearby.length === 0) gaps.push("no grocery store within 2km");
  if (pharmacyNearby.length === 0) gaps.push("no pharmacy nearby");

  if (gaps.length === 0) return summary;

  const signal = `Daily-life note: ${gaps.join(" and ")} — factor this into a longer stay.`;
  return { ...summary, summaryText: `${summary.summaryText} ${signal}` };
}
