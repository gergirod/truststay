"use client";

import { useEffect, useRef } from "react";
import type { MicroAreaNarrative } from "@/lib/placeEnrichmentAgent";
import { track } from "@/lib/analytics";

interface Props {
  microArea: MicroAreaNarrative;
  isWinner: boolean;
  intent: string; // e.g. "surf + heavy work"
  citySlug: string;
}

function readinessChip(
  label: string,
  value: "strong" | "moderate" | "limited",
) {
  const tone =
    value === "strong"
      ? "bg-teal/10 border-teal/25 text-teal-700"
      : value === "moderate"
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-red-50 border-red-200 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      {label}: {value}
    </span>
  );
}

export function MicroAreaBaseCard({ microArea, isWinner, intent, citySlug }: Props) {
  const { narrativeText, hasConstraintBreakers, score, rank } = microArea;
  const isBroken = hasConstraintBreakers;
  const logisticsRef = useRef<HTMLDivElement | null>(null);
  const didTrackLogistics = useRef(false);

  useEffect(() => {
    if (!narrativeText.logistics || !logisticsRef.current || didTrackLogistics.current) return;
    const el = logisticsRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !didTrackLogistics.current) {
          didTrackLogistics.current = true;
          track("logistics_section_engaged", {
            city_slug: citySlug,
            micro_area_id: microArea.microAreaId,
            micro_area_name: microArea.name,
            source: "micro_area_card",
          });
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [citySlug, microArea.microAreaId, microArea.name, narrativeText.logistics]);

  return (
    <div
      id={`micro-area-card-${microArea.microAreaId}`}
      className={`overflow-hidden rounded-2xl border shadow-sm transition-all ${
        isWinner
          ? "border-bark bg-white"
          : isBroken
          ? "border-dune/60 bg-cream/60 opacity-80"
          : "border-dune bg-white"
      }`}
    >
      {/* Top accent — winner is bark, others are dune */}
      <div className={`h-[3px] ${isWinner ? "bg-bark" : isBroken ? "bg-dune/50" : "bg-dune"}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Rank badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isWinner
                    ? "bg-bark text-white"
                    : isBroken
                    ? "bg-dune/60 text-umber"
                    : "bg-cream border border-dune text-umber"
                }`}
              >
                {rank}
              </span>
              {isWinner && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-bark">
                  Top pick
                </span>
              )}
              {isBroken && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                  Not recommended
                </span>
              )}
            </div>

            <h3 className={`text-xl font-semibold tracking-tight ${isBroken ? "text-umber/70" : "text-bark"}`}>
              {microArea.name}
            </h3>
            <p className="mt-0.5 text-xs text-umber">For {intent}</p>
          </div>

          {/* Score pill */}
          <div
            className={`shrink-0 rounded-full px-3 py-1.5 text-center ${
              score >= 7
                ? "bg-mist border border-sage/40"
                : score >= 4
                ? "bg-cream border border-dune"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <span className={`block text-lg font-bold leading-none ${
              score >= 7 ? "text-teal" : score >= 4 ? "text-umber" : "text-red-600"
            }`}>
              {score.toFixed(1)}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wider text-umber/60">/10</span>
          </div>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4 border-t border-dune pt-5">
          {microArea.readiness && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                Day-1 readiness
              </p>
              <div className="flex flex-wrap gap-2">
                {readinessChip("Work setup", microArea.readiness.workSetup)}
                {readinessChip("Daily routine", microArea.readiness.dailyRoutine)}
                {readinessChip("Activity access", microArea.readiness.activityAccess)}
                {readinessChip("Movement", microArea.readiness.movement)}
              </div>
            </div>
          )}

          {/* Why it fits */}
          {narrativeText.whyItFits && (
            <p className={`text-sm leading-6 ${isBroken ? "text-umber/70" : "text-umber"}`}>
              {narrativeText.whyItFits}
            </p>
          )}

          {/* Constraint breaker warning */}
          {isBroken && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <span className="mt-px text-sm text-amber-500" aria-hidden="true">⚠</span>
              <p className="text-sm leading-5 text-amber-800">
                {narrativeText.planAround || "This zone has constraints that break requirements for this profile."}
              </p>
            </div>
          )}

          {/* Daily rhythm — only for non-broken zones */}
          {!isBroken && narrativeText.dailyRhythm && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                Your typical day
              </p>
              <p className="text-sm leading-6 text-bark">{narrativeText.dailyRhythm}</p>
            </div>
          )}

          {/* Walking options */}
          {!isBroken && narrativeText.walkingOptions && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                Walking from here
              </p>
              <p className="text-sm leading-6 text-umber">{narrativeText.walkingOptions}</p>
            </div>
          )}

          {/* Plan around — non-broken zones */}
          {!isBroken && narrativeText.planAround && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                Plan around
              </p>
              <p className="text-sm leading-6 text-umber">{narrativeText.planAround}</p>
            </div>
          )}

          {/* Logistics */}
          {narrativeText.logistics && (
            <div ref={logisticsRef} className="rounded-xl border border-dune bg-cream px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
                Daily logistics
              </p>
              <p className="mt-1 text-sm leading-5 text-bark">{narrativeText.logistics}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
