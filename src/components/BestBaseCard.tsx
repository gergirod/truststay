"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { CHECKOUT_PENDING_KEY } from "@/components/CheckoutSuccessTracker";
import type {
  StayFitResult,
  StayIntent,
  PlaceCategory,
  DailyLifePlaceType,
} from "@/types";

interface Props {
  isUnlocked: boolean;
  cityName: string;
  citySlug: string;
  country: string;
  stayFit: StayFitResult;
  intent: StayIntent;
  /**
   * LLM-generated narrative from getOrGenerateStayFitNarrative().
   * When present, drives all 5 sections of the unlocked card.
   * Null = fall back to deterministic output.
   */
  narrativeText?: {
    whyItFits: string;
    dailyRhythm: string;
    walkingOptions: string;
    planAround: string;
    logistics: string;
  } | null;
  /**
   * Direct link to the recommended neighborhood page, with intent params already
   * included. When present and unlocked, a "Explore full setup →" link is shown.
   */
  baseNeighborhoodHref?: string | null;
  /**
   * When true, a soft low-confidence note is shown. Used for thin destinations
   * where place data is limited (< 6 places found) so the user interprets the
   * recommendation with appropriate context.
   */
  lowConfidence?: boolean;
}

// ── Copy helpers ──────────────────────────────────────────────────────────────

function intentLabel(intent: StayIntent): string {
  const purposeMap: Record<string, string> = {
    surf: "surf",
    dive: "dive",
    hike: "hike",
    yoga: "yoga",
    kite: "kite",
    work_first: "focused work",
    exploring: "exploring",
  };
  const workMap: Record<string, string> = {
    light: "light work",
    balanced: "balanced work",
    heavy: "heavy work",
  };
  if (intent.purpose === "work_first") return "focused remote work";
  if (intent.purpose === "exploring") return `exploring + ${workMap[intent.workStyle]}`;
  return `${purposeMap[intent.purpose] ?? intent.purpose} + ${workMap[intent.workStyle]}`;
}

function categoryLabel(category: PlaceCategory): string {
  if (category === "coworking") return "Coworking";
  if (category === "cafe") return "Café";
  if (category === "food") return "Food";
  return "Wellbeing";
}

function dailyLifeTypeLabel(type: DailyLifePlaceType): string {
  if (type === "grocery") return "Grocery";
  if (type === "convenience") return "Convenience";
  if (type === "pharmacy") return "Pharmacy";
  return "Laundry";
}

function formatDist(km: number): string {
  if (km < 0.1) return "< 100 m";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Build the "why this fits" paragraph from real place data.
 * Tone: calm, knowledgeable, honest — preparation advice, not a data dump.
 */
function buildWhyItFits(stayFit: StayFitResult, intent: StayIntent): string {
  const { topWorkPlaces, topDailyLifePlaces, scoreBreakdown: s, profile } = stayFit;

  const coworkingCount = topWorkPlaces.filter((p) => p.category === "coworking").length;
  const cafeCount = topWorkPlaces.filter((p) => p.category === "cafe").length;
  const hasGroceryClose = topDailyLifePlaces.some(
    (d) => (d.type === "grocery" || d.type === "convenience") && d.distanceKm < 2
  );
  const hasPharmacyClose = topDailyLifePlaces.some(
    (d) => d.type === "pharmacy" && d.distanceKm < 2.5
  );

  const parts: string[] = [];

  const ACTIVITY_PURPOSE_LABELS: Record<string, string> = {
    surf: "Surf", dive: "Dive", hike: "Hike",
    yoga: "Yoga", kite: "Kite", exploring: "Exploring",
  };

  // Is this an activity user whose daily balance happens to be work-first?
  // (i.e. purpose ≠ work_first but profile resolved to work_primary)
  const isActivityWorkFirst =
    profile === "work_primary" && intent.purpose !== "work_first";

  // ── Main sentence — always leads with purpose when there is one ────────────
  if (isActivityWorkFirst) {
    // Activity user, work-first balance — acknowledge BOTH: purpose + work
    const purposeStr = ACTIVITY_PURPOSE_LABELS[intent.purpose] ?? "Activity";
    if (coworkingCount >= 1) {
      parts.push(
        `${purposeStr} access is there from this base. Work is also covered — ${coworkingCount > 1 ? `${coworkingCount} coworkings` : "a coworking"} within reach for your focused sessions.`
      );
    } else if (cafeCount >= 2) {
      parts.push(
        `${purposeStr} access is there. Work sessions will rely on ${cafeCount} nearby cafés — enough for most remote days, but no dedicated desk.`
      );
    } else if (cafeCount === 1) {
      parts.push(
        `${purposeStr} access from this base. Work sessions have one café option nearby — test it on arrival before depending on it.`
      );
    } else {
      parts.push(
        `${purposeStr} access is the draw. Work infrastructure near the base is thin — plan your setup before you need it.`
      );
    }
  } else if (profile === "work_primary") {
    // True work-first purpose
    if (s.workFit >= 60) {
      if (coworkingCount >= 2) {
        parts.push("Solid work setup: multiple coworkings within reach of this base.");
      } else if (coworkingCount === 1) {
        parts.push(
          "One dedicated coworking nearby, with café backup — a workable setup for a focused stay."
        );
      } else {
        parts.push(
          "Work-capable cafés cover your sessions — no dedicated desk, but enough to stay productive."
        );
      }
    } else if (s.workFit >= 35) {
      if (coworkingCount >= 1) {
        parts.push(
          "One coworking within reach — manageable for heavy work. Confirm availability before depending on it."
        );
      } else {
        parts.push(
          "Café-only work setup here. Options available, but expect some variability — test connections on arrival."
        );
      }
    } else {
      parts.push(
        coworkingCount === 0
          ? "Work infrastructure near this base is limited — no coworking found, café options are thin. Plan your setup carefully."
          : "Work options here will require effort. If deep focus work is the goal, factor in extra setup time."
      );
    }
  } else {
    // Activity profiles — purpose leads, work is secondary
    const purposeStr = ACTIVITY_PURPOSE_LABELS[intent.purpose] ?? "Activity";
    if (coworkingCount >= 1) {
      parts.push(
        `${purposeStr} is the draw here. Work sessions are well covered — a coworking${coworkingCount > 1 ? ` and ${cafeCount} café${cafeCount !== 1 ? "s" : ""}` : ""} within reach.`
      );
    } else if (cafeCount >= 2) {
      parts.push(
        `${purposeStr} is the draw here. ${cafeCount} work-capable café${cafeCount !== 1 ? "s" : ""} nearby for your sessions — enough for light to balanced work days.`
      );
    } else if (cafeCount === 1) {
      parts.push(
        `${purposeStr} first, work second — one café option for sessions, no backup if it's busy.`
      );
    } else {
      parts.push(
        `${purposeStr} is strong here. Work options near the base are limited — worth identifying a spot before you need one.`
      );
    }
  }

  // ── Daily-life sentence ────────────────────────────────────────────────────
  if (hasGroceryClose && hasPharmacyClose) {
    parts.push("Daily logistics are covered — grocery and pharmacy both nearby.");
  } else if (hasGroceryClose) {
    parts.push("Grocery is accessible. Pharmacy will require transport — worth planning for stays over two weeks.");
  } else if (!hasGroceryClose) {
    parts.push("No grocery within easy reach — daily shopping will need a regular trip.");
  }

  return parts.join(" ");
}

/**
 * Build the "plan around" list.
 * Uses real redFlags from the scoring engine — deterministic, honest.
 * Falls back to a soft profile note if no flags exist.
 */
function buildTradeoffs(stayFit: StayFitResult): string[] {
  const flags = stayFit.redFlags.slice(0, 2);
  if (flags.length >= 1) return flags;

  // No hard red flags — add a soft profile note so the section isn't empty
  const { profile } = stayFit;
  if (profile === "activity_light_work" || profile === "activity_balanced_work") {
    return [
      `Café wifi can vary — worth testing a spot before your first focused session.`,
    ];
  }
  if (profile === "work_primary") {
    return [
      `Conditions can vary locally — confirm wifi and hours before locking in a routine.`,
    ];
  }
  return [];
}

// ── Main component ────────────────────────────────────────────────────────────

export function BestBaseCard({
  isUnlocked,
  cityName,
  citySlug,
  country,
  stayFit,
  intent,
  narrativeText = null,
  baseNeighborhoodHref = null,
  lowConfidence = false,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChangeIntent() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("purpose");
    params.delete("workStyle");
    track("intent_change_clicked", {
      city_slug: citySlug,
      previous_purpose: intent.purpose,
      previous_work_style: intent.workStyle,
    });
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function handleUnlock() {
    track("best_base_unlock_clicked", {
      city_slug: citySlug,
      city_name: cityName,
      country,
      intent_purpose: intent.purpose,
      intent_work_style: intent.workStyle,
      stay_fit_profile: stayFit.profile,
      stay_fit_score: stayFit.fitScore,
    });

    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "city_pass",
          citySlug,
          purpose: intent.purpose,
          workStyle: intent.workStyle,
          ...(intent.dailyBalance ? { dailyBalance: intent.dailyBalance } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        track("checkout_started", {
          city_slug: citySlug,
          city_name: cityName,
          country,
          source: "best_base_card",
        });
        sessionStorage.setItem(CHECKOUT_PENDING_KEY, citySlug);
        window.location.href = data.checkoutUrl;
      } else {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not start checkout. Keep browsing the free setup and try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Payment service is temporarily unavailable. Please try again in a moment.");
    }
  }

  // ── Derive unlocked section content ──────────────────────────────────────────
  const whyItFits     = isUnlocked ? (narrativeText?.whyItFits      ?? buildWhyItFits(stayFit, intent)) : null;
  const dailyRhythm   = isUnlocked ? (narrativeText?.dailyRhythm    ?? null) : null;
  const walkingOpts   = isUnlocked ? (narrativeText?.walkingOptions  ?? null) : null;
  const mainRedFlag   = isUnlocked ? (stayFit.redFlags[0]           ?? null) : null;
  const planAround    = isUnlocked ? (narrativeText?.planAround      ?? buildTradeoffs(stayFit)[0] ?? null) : null;
  const logistics     = isUnlocked ? (narrativeText?.logistics       ?? null) : null;

  // Top 3 nearby places: up to 2 work spots + 1 daily-life
  const topWorkPlaces = isUnlocked ? stayFit.topWorkPlaces.slice(0, 2) : [];
  const topDailyLife  = isUnlocked ? stayFit.topDailyLifePlaces[0] ?? null : null;

  function scrollToPlace(id: string) {
    document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-dune bg-white shadow-sm">
      {/* Subtle top accent — bark instead of sage to visually separate from RoutineSummaryCard */}
      <div className="h-[3px] bg-bark" />

      <div className="p-6">
        {/* ── Header — always visible ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
              {isUnlocked ? `Your base in ${cityName}` : "Know where to stay before you book"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-bark">
              {stayFit.baseArea}
            </h2>
            {/* Intent context + change link */}
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-xs text-umber">
                For{" "}
                <span className="font-medium text-bark">{intentLabel(intent)}</span>
              </p>
              <span className="text-dune">·</span>
              <button
                onClick={handleChangeIntent}
                className="text-xs text-umber/50 underline-offset-2 transition-colors hover:text-umber hover:underline"
              >
                Change
              </button>
            </div>
          </div>
          {/* Fit label — only when unlocked, very subtle */}
          {isUnlocked && (
            <span
              className={`mt-1 shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                stayFit.fitLabel === "Strong"
                  ? "border-sage/60 bg-mist text-teal"
                  : stayFit.fitLabel === "Moderate"
                  ? "border-dune bg-cream text-umber"
                  : "border-dune bg-cream text-umber"
              }`}
            >
              {stayFit.fitLabel === "Strong"
                ? "Good fit"
                : stayFit.fitLabel === "Moderate"
                ? "Workable"
                : "Check setup"}
            </span>
          )}
        </div>

        {/* ── Locked state ────────────────────────────────────────────── */}
        {!isUnlocked && (
          <>
            {/* Placeholder lines — structural hint, not blurred content */}
            <div className="mt-5 space-y-2" aria-hidden="true">
              <div className="h-3.5 w-[88%] rounded-full bg-dune/50" />
              <div className="h-3.5 w-[72%] rounded-full bg-dune/50" />
              <div className="h-3.5 w-[80%] rounded-full bg-dune/50" />
            </div>

            <p className="mt-5 text-sm text-umber">
              Your base analysis for{" "}
              <span className="font-medium text-bark">{intentLabel(intent)}</span>{" "}
              is ready — unlock to compare all ranked micro-areas in this destination, including why each one fits, tradeoffs, and nearby support.
            </p>

            <ul className="mt-4 space-y-1.5">
              {[
                "All ranked micro-areas for this destination",
                "Why each base fits your stay + tradeoffs to plan around",
                "All work spots, cafés, and wellbeing places per base area",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-umber">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-dune" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Low-confidence note — shown when place data is thin */}
            {lowConfidence && (
              <p className="mt-4 text-xs leading-5 text-umber/60">
                Limited place data for this destination — the recommendation is based on what&rsquo;s available and should be treated as a general orientation.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleUnlock}
                disabled={status === "loading"}
                className="w-full rounded-xl bg-bark px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {status === "loading" ? "Opening checkout…" : "Unlock all micro-area insights →"}
              </button>
              <p className="text-xs text-umber">
                One-time &middot; No account needed &middot; Instant access
              </p>
            </div>

            {status === "error" && (
              <p className="mt-3 text-sm text-red-600">
                {errorMessage || "Could not start checkout — please try again."}
              </p>
            )}
          </>
        )}

        {/* ── Unlocked state ──────────────────────────────────────────── */}
        {isUnlocked && (
          <div className="mt-5 space-y-5 border-t border-dune pt-5">

            {/* 1 — Why it fits */}
            {whyItFits && (
              <p className="text-sm leading-6 text-umber">{whyItFits}</p>
            )}

            {lowConfidence && (
              <p className="text-xs leading-5 text-umber/60">
                Based on limited place data — treat this as a general orientation.
              </p>
            )}

            {/* 2 — Your typical day */}
            {dailyRhythm && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                  Your typical day
                </p>
                <p className="text-sm leading-6 text-bark">{dailyRhythm}</p>
              </div>
            )}

            {/* 3 — Walking from here */}
            {walkingOpts && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                  Walking from here
                </p>
                <p className="text-sm leading-6 text-umber">{walkingOpts}</p>
              </div>
            )}

            {/* 4 — Plan around */}
            {(mainRedFlag || planAround) && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                  Plan around
                </p>
                {mainRedFlag && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3">
                    <span className="mt-px text-xs text-amber-500" aria-hidden="true">⚠</span>
                    <p className="text-sm leading-5 text-amber-800">{mainRedFlag}</p>
                  </div>
                )}
                {planAround && (
                  <p className={`text-sm leading-6 text-umber ${mainRedFlag ? "mt-2.5" : ""}`}>
                    {planAround}
                  </p>
                )}
              </div>
            )}

            {/* 5 — Logistics */}
            {logistics && (
              <div className="rounded-xl border border-dune bg-cream px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                  Daily logistics
                </p>
                <p className="mt-1 text-sm leading-5 text-bark">{logistics}</p>
              </div>
            )}

            {/* Nearby places — quick reference */}
            {(topWorkPlaces.length > 0 || topDailyLife) && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                  Nearby
                </p>
                <div className="divide-y divide-dune rounded-xl border border-dune">
                  {topWorkPlaces.map((place) => (
                    <div key={place.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <button
                          onClick={() => scrollToPlace(place.id)}
                          className="truncate text-left text-sm font-medium text-bark hover:underline underline-offset-2"
                        >
                          {place.name}
                        </button>
                        <p className="text-xs text-umber">{categoryLabel(place.category)}</p>
                      </div>
                      {(place.distanceFromBasekm ?? null) !== null && (
                        <span className="shrink-0 text-xs text-umber/60">
                          {formatDist(place.distanceFromBasekm!)}
                        </span>
                      )}
                    </div>
                  ))}
                  {topDailyLife && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-bark">{topDailyLife.name}</p>
                        <p className="text-xs text-umber">{dailyLifeTypeLabel(topDailyLife.type)}</p>
                      </div>
                      <span className="shrink-0 text-xs text-umber/60">
                        {formatDist(topDailyLife.distanceKm)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Deep-link to the recommended neighborhood page */}
            {baseNeighborhoodHref && (
              <div className="border-t border-dune pt-5">
                <a
                  href={baseNeighborhoodHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:underline underline-offset-2"
                >
                  Explore full setup for {stayFit.baseArea}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
