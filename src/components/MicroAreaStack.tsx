"use client";

import { useEffect, useState } from "react";
import type { MicroAreaNarrative } from "@/lib/placeEnrichmentAgent";
import { MicroAreaBaseCard } from "@/components/MicroAreaBaseCard";
import { track } from "@/lib/analytics";

interface Props {
  microAreaNarratives: MicroAreaNarrative[];
  intent: string; // e.g. "surf + heavy work"
  cityName: string;
  citySlug: string;
}

type InternetSummary = {
  score: number | null;
  bucket: "excellent" | "good" | "okay" | "risky" | "unknown";
  median_download_mbps: number | null;
  median_upload_mbps: number | null;
  median_latency_ms: number | null;
  confidence: "low" | "medium" | "high";
  freshness_days: number | null;
};

export function MicroAreaStack({ microAreaNarratives, intent, cityName, citySlug }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [internetByAreaId, setInternetByAreaId] = useState<Record<string, InternetSummary>>({});

  // Always show winner + first 2; rest collapsed unless showAll
  const sorted = [...microAreaNarratives].sort((a, b) => a.rank - b.rank);
  const winnerArea = sorted[0];
  const otherAreas = sorted.slice(1);

  // How many non-winner areas to show collapsed
  const visibleOthers = showAll ? otherAreas : otherAreas.slice(0, 1);
  const hiddenCount = otherAreas.length - 1;
  const compareItems = sorted.slice(0, 3);

  function readinessTone(value?: "strong" | "moderate" | "limited"): string {
    if (value === "strong") return "text-teal-700";
    if (value === "moderate") return "text-amber-700";
    return "text-red-700";
  }

  useEffect(() => {
    track("micro_area_compared", {
      city_slug: citySlug,
      city_name: cityName,
      action: "panel_viewed",
      compared_count: compareItems.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const withCenter = microAreaNarratives.filter((m) => m.center);
    if (withCenter.length === 0) {
      setInternetByAreaId({});
      return;
    }

    Promise.all(
      withCenter.map(async (area) => {
        const res = await fetch(
          `/api/connectivity/summary?citySlug=${encodeURIComponent(citySlug)}&lat=${encodeURIComponent(String(area.center!.lat))}&lng=${encodeURIComponent(String(area.center!.lon))}`,
        );
        if (!res.ok) return null;
        const json = await res.json();
        if (json?.source?.name === "fallback_unknown") {
          const unknownParsed: InternetSummary = {
            score: null,
            bucket: "unknown",
            median_download_mbps: null,
            median_upload_mbps: null,
            median_latency_ms: null,
            confidence: "low",
            freshness_days: null,
          };
          return [area.microAreaId, unknownParsed] as const;
        }
        const summary = json?.summary;
        if (!summary || typeof summary.score !== "number" || typeof summary.bucket !== "string") {
          return null;
        }
        const bucketRaw = summary.bucket as string;
        if (
          bucketRaw !== "excellent" &&
          bucketRaw !== "good" &&
          bucketRaw !== "okay" &&
          bucketRaw !== "risky"
        ) {
          return null;
        }
        const confidenceRaw = String(summary.confidence ?? "low");
        const confidence: InternetSummary["confidence"] =
          confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
            ? confidenceRaw
            : "low";
        const parsed: InternetSummary = {
          score: Number(summary.score),
          bucket: bucketRaw,
          median_download_mbps:
            typeof summary.median_download_mbps === "number" ? summary.median_download_mbps : null,
          median_upload_mbps:
            typeof summary.median_upload_mbps === "number" ? summary.median_upload_mbps : null,
          median_latency_ms:
            typeof summary.median_latency_ms === "number" ? summary.median_latency_ms : null,
          confidence,
          freshness_days:
            typeof summary.freshness_days === "number" ? summary.freshness_days : null,
        };
        return [area.microAreaId, parsed] as const;
      }),
    )
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, InternetSummary> = {};
        for (const row of rows) {
          if (!row) continue;
          next[row[0]] = row[1];
        }
        setInternetByAreaId(next);
      })
      .catch(() => {
        if (cancelled) return;
        setInternetByAreaId({});
      });

    return () => {
      cancelled = true;
    };
  }, [citySlug, microAreaNarratives]);

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-umber">
          {microAreaNarratives.length} micro-areas in {cityName}
        </p>
        <p className="mt-0.5 text-xs text-umber/60">
          Ranked by fit score for your profile — compare day-1 readiness and tradeoffs
        </p>
      </div>

      {compareItems.length > 1 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-dune bg-white">
          <div className="border-b border-dune px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-umber">
            Quick compare (top {compareItems.length})
          </div>
          <div className="grid gap-px bg-dune sm:grid-cols-3">
            {compareItems.map((area) => (
              <button
                key={area.microAreaId}
                onClick={() => {
                  document.getElementById(`micro-area-card-${area.microAreaId}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  track("micro_area_compared", {
                    city_slug: citySlug,
                    city_name: cityName,
                    action: "compare_item_clicked",
                    micro_area_id: area.microAreaId,
                    micro_area_name: area.name,
                  });
                }}
                className="bg-white px-3 py-3 text-left transition-colors hover:bg-cream/60"
              >
                <p className="text-sm font-semibold text-bark">{area.name}</p>
                <p className="text-xs text-umber">Score {area.score.toFixed(1)}/10</p>
                {area.readiness ? (
                  <div className="mt-2 space-y-1 text-[11px]">
                    <p className={readinessTone(area.readiness.workSetup)}>
                      Work: {area.readiness.workSetup}
                    </p>
                    <p className={readinessTone(area.readiness.dailyRoutine)}>
                      Routine: {area.readiness.dailyRoutine}
                    </p>
                    <p className={readinessTone(area.readiness.activityAccess)}>
                      Activity: {area.readiness.activityAccess}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-umber/70">Readiness data not available</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Winner always shown fully */}
        {winnerArea && (
          <MicroAreaBaseCard
            microArea={winnerArea}
            isWinner={true}
            intent={intent}
            citySlug={citySlug}
            internetSummary={internetByAreaId[winnerArea.microAreaId] ?? null}
          />
        )}

        {/* Other areas — collapsed by default beyond first */}
        {visibleOthers.map((area) => (
          <MicroAreaBaseCard
            key={area.microAreaId}
            microArea={area}
            isWinner={false}
            intent={intent}
            citySlug={citySlug}
            internetSummary={internetByAreaId[area.microAreaId] ?? null}
          />
        ))}

        {/* Show more / show less toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => {
              const next = !showAll;
              setShowAll(next);
              track("micro_area_compared", {
                city_slug: citySlug,
                city_name: cityName,
                action: next ? "expanded_list" : "collapsed_list",
                hidden_count: hiddenCount,
              });
            }}
            className="w-full rounded-xl border border-dune bg-cream px-4 py-3 text-sm text-umber transition-colors hover:bg-dune/20"
          >
            {showAll
              ? "Show less ↑"
              : `Show ${hiddenCount} more area${hiddenCount !== 1 ? "s" : ""} ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
