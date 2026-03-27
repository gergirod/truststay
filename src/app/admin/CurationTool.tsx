"use client";

import { useState, useEffect } from "react";
import type { NeighborhoodEntry } from "@/data/neighborhoods";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";

const CURATED_CITY_NAMES = Object.values(CURATED_NEIGHBORHOODS).map(
  (c) => c.cityName
);

interface QualityReason {
  pass: boolean;
  label: string;
}

interface QualityCheck {
  passes: boolean;
  score: number;
  reasons: QualityReason[];
}

interface DiscoverResult {
  city: {
    name: string;
    slug: string;
    country: string;
    lat: number;
    lon: number;
  };
  source: "curated" | "auto-discovered";
  placeCounts: {
    cafes: number;
    coworkings: number;
    gyms: number;
    food: number;
    total: number;
    enriched?: number;
  };
  neighborhoods: NeighborhoodEntry[];
  qualityCheck?: QualityCheck;
}

interface DemandCity {
  slug: string;
  name: string;
  searches: number;
  isCurated: boolean;
}

interface NeighborhoodQuality {
  avgGoogleRating: number | null;
  enrichedPlaceCount: number;
  totalPlaceCount: number;
  hasCoworking: boolean;
  openingHoursCount: number;
}

interface EditableNeighborhood extends NeighborhoodEntry {
  selected: boolean;
  editedTagline: string;
  editedName: string;
  quality?: NeighborhoodQuality;
}

function CuratedCitiesBar({
  onSelect,
}: {
  onSelect: (city: string) => void;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54] mb-2">
        Already curated — click to review
      </p>
      <div className="flex flex-wrap gap-2">
        {CURATED_CITY_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="text-sm px-3 py-1.5 rounded-lg border border-[#8FB7B3] bg-[#DCEBE9] text-[#2E2A26] hover:bg-[#c8dedd] transition-colors font-medium"
          >
            ✓ {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DemandQueue({
  secret,
  onSelect,
}: {
  secret: string;
  onSelect: (city: string) => void;
}) {
  const [cities, setCities] = useState<DemandCity[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not_configured" | "error">("loading");

  useEffect(() => {
    fetch(`/api/admin/demand?secret=${encodeURIComponent(secret)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error === "not_configured") {
          setStatus("not_configured");
        } else if (data.cities) {
          setCities(data.cities);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [secret]);

  return (
    <div className="mb-8 rounded-xl border border-[#E4DDD2] bg-white px-5 py-5">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-[#2E2A26]">Demand queue</p>
        <span className="text-xs text-[#5F5A54]">— top searched cities in last 30 days</span>
      </div>

      {status === "loading" && (
        <p className="text-xs text-[#5F5A54]">Loading PostHog data…</p>
      )}

      {status === "not_configured" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">PostHog API not configured</p>
          <p className="mb-2">Add these to your <code>.env.local</code> and Vercel env vars:</p>
          <pre className="bg-amber-100 rounded p-2 text-xs leading-5">{`POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=12345`}</pre>
          <p className="mt-2">Get your personal API key from PostHog → Settings → Personal API keys. Project ID is the number in your PostHog project URL.</p>
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-red-600">Could not fetch demand data. Check console.</p>
      )}

      {status === "ready" && cities && (
        <>
          {cities.length === 0 ? (
            <p className="text-xs text-[#5F5A54]">No searches recorded yet. Start posting and come back.</p>
          ) : (
            <div className="space-y-1">
              {cities.map((city) => (
                <div
                  key={city.slug}
                  className="flex items-center gap-3 py-1.5"
                >
                  <div className="w-20 text-right">
                    <span className="text-xs font-semibold text-[#2E2A26]">{city.searches}</span>
                    <span className="text-xs text-[#5F5A54]"> searches</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-[#2E2A26]">{city.name}</span>
                    <span className="text-xs text-[#8FB7B3] font-mono">{city.slug}</span>
                    {city.isCurated ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#DCEBE9] text-[#2E2A26]">✓ curated</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">needs curation</span>
                    )}
                  </div>
                  {!city.isCurated && (
                    <button
                      onClick={() => onSelect(city.name)}
                      className="text-xs px-3 py-1.5 bg-[#2E2A26] text-white rounded-lg hover:bg-[#3d3832] transition-colors font-medium"
                    >
                      Discover →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QualityBadge({ check }: { check: QualityCheck }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            check.passes
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {check.passes ? "✓ Passes quality check" : "✗ Fails quality check"} · {check.score}%
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {check.reasons.map((r) => (
          <span
            key={r.label}
            className={`text-xs px-2 py-0.5 rounded-full ${
              r.pass
                ? "bg-stone-100 text-stone-600"
                : "bg-red-50 text-red-600 border border-red-100"
            }`}
          >
            {r.pass ? "✓" : "✗"} {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CurationTool({ secret }: { secret: string }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<EditableNeighborhood[]>([]);
  const [showCode, setShowCode] = useState(false);

  // When a curated city pill is clicked, load it automatically
  useEffect(() => {
    if (query && CURATED_CITY_NAMES.includes(query)) {
      handleDiscover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function handleDiscover() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowCode(false);

    try {
      const res = await fetch(
        `/api/admin/discover?q=${encodeURIComponent(query)}&secret=${encodeURIComponent(secret)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
        return;
      }
      setResult(data);
      setNeighborhoods(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.neighborhoods.map((n: any) => ({
          ...n,
          selected: true,
          editedTagline: n.tagline,
          editedName: n.name,
          quality: n.quality,
        }))
      );
    } catch {
      setError("Request failed. Check the console.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(slug: string) {
    setNeighborhoods((prev) =>
      prev.map((n) => (n.slug === slug ? { ...n, selected: !n.selected } : n))
    );
  }

  function updateTagline(slug: string, value: string) {
    setNeighborhoods((prev) =>
      prev.map((n) => (n.slug === slug ? { ...n, editedTagline: value } : n))
    );
  }

  function updateName(slug: string, value: string) {
    setNeighborhoods((prev) =>
      prev.map((n) => (n.slug === slug ? { ...n, editedName: value } : n))
    );
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setNeighborhoods((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setNeighborhoods((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function generateCode(): string {
    if (!result) return "";
    const selected = neighborhoods.filter((n) => n.selected);
    if (selected.length === 0) return "// No neighborhoods selected";

    const lines = selected.map((n) => {
      const bboxStr = `[${n.bbox.join(", ")}]`;
      return `      {
        name: "${n.editedName}",
        slug: "${n.slug}",
        lat: ${n.lat},
        lon: ${n.lon},
        bbox: ${bboxStr} as [number, number, number, number],
        tagline: "${n.editedTagline.replace(/"/g, '\\"')}",
        directionFromCenter: "${n.directionFromCenter}",
        distanceFromCenterKm: ${n.distanceFromCenterKm},
      }`;
    });

    return `  "${result.city.slug}": {
    cityName: "${result.city.name}",
    citySlug: "${result.city.slug}",
    neighborhoods: [
${lines.join(",\n")}
    ],
  },`;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      {/* Header */}
      <header className="border-b border-[#E4DDD2] bg-white px-6 py-4 flex items-center gap-3">
        <span className="text-base font-semibold text-[#2E2A26]">Truststay</span>
        <div className="h-4 w-px bg-[#E4DDD2]" />
        <span className="text-sm text-[#5F5A54]">Neighborhood Curation Tool</span>
        <div className="ml-auto">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
            Admin
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Intro */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2E2A26] mb-2">
            Curate neighborhoods
          </h1>
          <p className="text-sm text-[#5F5A54] max-w-xl">
            Search any city to see the auto-discovered neighborhoods. Select the
            best ones for remote workers, edit taglines, reorder them, then copy
            the generated code into{" "}
            <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">
              src/data/neighborhoods.ts
            </code>
            .
          </p>
        </div>

        {/* Demand queue — top searched uncurated cities from PostHog */}
        <DemandQueue secret={secret} onSelect={(city) => { setQuery(city); }} />

        {/* Curated cities quick-access */}
        <CuratedCitiesBar onSelect={(city) => { setQuery(city); }} />

        {/* Search */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            placeholder="City name, e.g. Lisbon, Chiang Mai, Prague…"
            className="flex-1 rounded-xl border border-[#E4DDD2] bg-white px-4 py-3 text-sm text-[#2E2A26] placeholder:text-[#5F5A54] focus:outline-none focus:border-[#8FB7B3]"
          />
          <button
            onClick={handleDiscover}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-[#2E2A26] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#3d3832] transition-colors"
          >
            {loading ? "Discovering…" : "Discover"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* City summary */}
        {result && (
          <>
            <div className="mb-6 rounded-xl border border-[#E4DDD2] bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#8FB7B3]">
                      City resolved
                    </p>
                    {result.source === "curated" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCEBE9] text-[#2E2A26]">
                        ✓ Already curated
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Auto-discovered
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-[#2E2A26]">
                    {result.city.name}
                    {result.city.country && (
                      <span className="text-sm font-normal text-[#5F5A54] ml-2">
                        {result.city.country}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#5F5A54] mt-0.5">
                    slug: <code>{result.city.slug}</code> · {result.city.lat.toFixed(4)},{" "}
                    {result.city.lon.toFixed(4)}
                  </p>
                  {result.qualityCheck && (
                    <QualityBadge check={result.qualityCheck} />
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#5F5A54] mb-1">City-wide place counts</p>
                  <div className="flex gap-3 text-xs">
                    <span className="bg-[#DCEBE9] text-[#2E2A26] px-2 py-0.5 rounded-full">
                      {result.placeCounts.cafes} cafés
                    </span>
                    <span className="bg-[#DCEBE9] text-[#2E2A26] px-2 py-0.5 rounded-full">
                      {result.placeCounts.coworkings} coworkings
                    </span>
                    <span className="bg-[#DCEBE9] text-[#2E2A26] px-2 py-0.5 rounded-full">
                              {result.placeCounts.gyms} gyms
                            </span>
                            {"enriched" in result.placeCounts && (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                                {(result.placeCounts as { enriched: number }).enriched} Google-enriched
                              </span>
                            )}
                  </div>
                </div>
              </div>
            </div>

            {neighborhoods.length === 0 ? (
              <div className="rounded-xl border border-[#E4DDD2] bg-white px-5 py-8 text-center">
                <p className="text-sm text-[#5F5A54]">
                  No neighborhoods discovered. OSM may not have{" "}
                  <code className="text-xs">place=suburb</code> or{" "}
                  <code className="text-xs">place=neighbourhood</code> data for this
                  city, or there aren&apos;t enough POIs to score them.
                </p>
                <p className="text-xs text-[#5F5A54] mt-2">
                  You can still add this city manually to{" "}
                  <code>src/data/neighborhoods.ts</code>.
                </p>
              </div>
            ) : (
              <>
                  {result.source === "curated" && (
                    <div className="mb-4 rounded-lg bg-[#DCEBE9] px-4 py-3 text-sm text-[#2E2A26]">
                      This city is already curated. Edit taglines or reorder, then
                      regenerate the code to update{" "}
                      <code className="text-xs">src/data/neighborhoods.ts</code>.
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[#2E2A26]">
                    {neighborhoods.length} neighborhood
                    {neighborhoods.length !== 1 ? "s" : ""}{" "}
                    {result.source === "curated" ? "curated" : "discovered"} ·{" "}
                    <span className="text-[#8FB7B3]">
                      {neighborhoods.filter((n) => n.selected).length} selected
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setNeighborhoods((prev) =>
                          prev.map((n) => ({ ...n, selected: true }))
                        )
                      }
                      className="text-xs text-[#5F5A54] hover:text-[#2E2A26] underline"
                    >
                      Select all
                    </button>
                    <span className="text-[#E4DDD2]">|</span>
                    <button
                      onClick={() =>
                        setNeighborhoods((prev) =>
                          prev.map((n) => ({ ...n, selected: false }))
                        )
                      }
                      className="text-xs text-[#5F5A54] hover:text-[#2E2A26] underline"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                {/* Neighborhood list */}
                <div className="space-y-3 mb-8">
                  {neighborhoods.map((n, idx) => (
                    <div
                      key={n.slug}
                      className={`rounded-xl border bg-white px-5 py-4 transition-opacity ${
                        n.selected
                          ? "border-[#E4DDD2]"
                          : "border-[#E4DDD2] opacity-40"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Select checkbox */}
                        <button
                          onClick={() => toggleSelect(n.slug)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            n.selected
                              ? "bg-[#8FB7B3] border-[#8FB7B3]"
                              : "border-[#E4DDD2]"
                          }`}
                        >
                          {n.selected && (
                            <svg
                              viewBox="0 0 10 8"
                              fill="none"
                              className="w-3 h-3"
                            >
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Rank badge */}
                            <span className="text-xs font-bold text-[#5F5A54] w-5 text-center">
                              #{idx + 1}
                            </span>
                            {/* Editable name */}
                            <input
                              type="text"
                              value={n.editedName}
                              onChange={(e) => updateName(n.slug, e.target.value)}
                              className="text-sm font-semibold text-[#2E2A26] bg-transparent border-b border-transparent hover:border-[#E4DDD2] focus:border-[#8FB7B3] focus:outline-none px-0.5 min-w-0"
                            />
                            {/* Direction + distance */}
                            <span className="text-xs text-[#8FB7B3] bg-[#DCEBE9] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                              {n.directionFromCenter} · {n.distanceFromCenterKm} km
                            </span>
                            {/* Maps link */}
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${n.lat}&mlon=${n.lon}&zoom=15`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#5F5A54] hover:text-[#8FB7B3] underline whitespace-nowrap flex-shrink-0"
                            >
                              OSM ↗
                            </a>
                          </div>
                          {/* Quality signals */}
                          {n.quality && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {n.quality.avgGoogleRating !== null && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  ★ {n.quality.avgGoogleRating} avg rating
                                </span>
                              )}
                              {n.quality.enrichedPlaceCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#DCEBE9] text-[#2E2A26]">
                                  {n.quality.enrichedPlaceCount} Google-enriched
                                </span>
                              )}
                              {n.quality.hasCoworking && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  has coworking
                                </span>
                              )}
                              {n.quality.openingHoursCount > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                  {n.quality.openingHoursCount} with hours
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                {n.quality.totalPlaceCount} places nearby
                              </span>
                            </div>
                          )}

                          {/* Editable tagline */}
                          <input
                            type="text"
                            value={n.editedTagline}
                            onChange={(e) => updateTagline(n.slug, e.target.value)}
                            className="w-full text-sm text-[#5F5A54] bg-stone-50 border border-[#E4DDD2] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#8FB7B3]"
                            placeholder="Tagline for this neighborhood…"
                          />
                          <p className="mt-1 text-xs text-[#5F5A54]">
                            slug: <code>{n.slug}</code>
                          </p>
                        </div>

                        {/* Reorder */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            className="text-[#5F5A54] hover:text-[#2E2A26] disabled:opacity-20 p-1"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === neighborhoods.length - 1}
                            className="text-[#5F5A54] hover:text-[#2E2A26] disabled:opacity-20 p-1"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate code */}
                <div className="border-t border-[#E4DDD2] pt-6">
                  <button
                    onClick={() => setShowCode((v) => !v)}
                    disabled={neighborhoods.filter((n) => n.selected).length === 0}
                    className="px-5 py-3 bg-[#2E2A26] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#3d3832] transition-colors"
                  >
                    {showCode ? "Hide code" : "Generate code to paste"}
                  </button>

                  {showCode && (
                    <div className="mt-4">
                      <p className="text-xs text-[#5F5A54] mb-2">
                        Paste this block inside{" "}
                        <code className="bg-stone-100 px-1 rounded">
                          CURATED_NEIGHBORHOODS
                        </code>{" "}
                        in{" "}
                        <code className="bg-stone-100 px-1 rounded">
                          src/data/neighborhoods.ts
                        </code>
                        :
                      </p>
                      <pre className="bg-[#2E2A26] text-green-300 text-xs rounded-xl p-5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {generateCode()}
                      </pre>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(generateCode())
                        }
                        className="mt-3 text-xs text-[#5F5A54] hover:text-[#2E2A26] underline"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
