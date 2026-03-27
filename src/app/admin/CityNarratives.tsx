"use client";

import { useState, useEffect, useRef } from "react";
import type { StoredNarrative } from "@/lib/kv";
import type { NarrativeOption } from "@/lib/narrativeAI";
import { CITY_INTROS } from "@/data/cityIntros";
import { CURATED_NEIGHBORHOODS } from "@/data/neighborhoods";

// Build a combined city list: curated + static intros
const STATIC_INTRO_SLUGS = Object.keys(CITY_INTROS);
const CURATED_SLUGS = Object.entries(CURATED_NEIGHBORHOODS).map(([slug, cfg]) => ({
  slug,
  name: cfg.cityName,
}));

function slugToName(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Merge curated + static intro slugs into a deduplicated city list
const ALL_KNOWN_CITIES: { slug: string; name: string }[] = (() => {
  const map = new Map<string, string>();
  CURATED_SLUGS.forEach(({ slug, name }) => map.set(slug, name));
  STATIC_INTRO_SLUGS.forEach((slug) => {
    if (!map.has(slug)) map.set(slug, slugToName(slug));
  });
  return Array.from(map.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

interface Props {
  secret: string;
}

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function CityNarratives({ secret }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cityName, setCityName] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [options, setOptions] = useState<NarrativeOption[] | null>(null);
  const [meta, setMeta] = useState<{
    routineScore: number; totalPlaces: number;
    baseCentroidAddress: string | null; confirmedCount: number;
  } | null>(null);

  const [selected, setSelected] = useState<NarrativeOption | null>(null);
  const [editedIntro, setEditedIntro] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [editedBaseAreaName, setEditedBaseAreaName] = useState("");
  const [editedBaseAreaReason, setEditedBaseAreaReason] = useState("");
  const [editedActivity, setEditedActivity] = useState<string>("");
  const [editedBestMonths, setEditedBestMonths] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [savedList, setSavedList] = useState<StoredNarrative[] | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const generatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slugEdited) setCitySlug(toSlug(cityName));
  }, [cityName, slugEdited]);

  useEffect(() => {
    if (selected) {
      setEditedIntro(selected.intro);
      setEditedSummary(selected.summaryText);
      setEditedBaseAreaName(selected.baseAreaName);
      setEditedBaseAreaReason(selected.baseAreaReason);
      setEditedActivity(selected.activity ?? "");
      setEditedBestMonths(selected.bestMonths ?? "");
    }
  }, [selected]);

  async function loadList() {
    setListLoading(true);
    try {
      const res = await fetch(`/api/admin/narratives?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      setSavedList(data.narratives ?? []);
    } catch {
      setSavedList([]);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadList();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function pickCity(slug: string, name: string) {
    setCityName(name);
    setCitySlug(slug);
    setSlugEdited(true);
    setOptions(null);
    setSelected(null);
    setSaveStatus("idle");
    setGenStatus("idle");
    setGenError(null);
    setTimeout(() => generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function handleGenerate() {
    if (!cityName.trim() || !citySlug.trim()) return;
    setGenStatus("loading");
    setGenError(null);
    setOptions(null);
    setSelected(null);
    setSaveStatus("idle");

    try {
      const res = await fetch(`/api/admin/generate-narrative?secret=${encodeURIComponent(secret)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName: cityName.trim(), citySlug: citySlug.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        const msgs: Record<string, string> = {
          openai_not_configured: "OpenAI API key not configured — add OPENAI_API_KEY to your environment.",
          city_not_found: "City not found — check the slug and try again.",
          overpass_failed: "Could not fetch place data from Overpass. Try again.",
          llm_failed: "LLM call failed. Try again.",
        };
        setGenError(msgs[data.error] ?? data.error);
        setGenStatus("error");
        return;
      }

      setOptions(data.options);
      setMeta(data.meta);
      setGenStatus("done");
    } catch {
      setGenError("Network error — try again.");
      setGenStatus("error");
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaveStatus("saving");
    const narrative: StoredNarrative = {
      citySlug: citySlug.trim(),
      cityName: cityName.trim(),
      country: "",
      intro: editedIntro,
      summaryText: editedSummary,
      baseAreaName: editedBaseAreaName,
      baseAreaReason: editedBaseAreaReason,
      activity: (editedActivity as StoredNarrative["activity"]) || null,
      bestMonths: editedBestMonths || null,
      generatedAt: new Date().toISOString(),
      editedAt: null,
    };
    try {
      const res = await fetch(`/api/admin/save-narrative?secret=${encodeURIComponent(secret)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(narrative),
      });
      const data = await res.json();
      if (data.ok) { setSaveStatus("saved"); loadList(); }
      else setSaveStatus("error");
    } catch { setSaveStatus("error"); }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete narrative for "${slug}"?`)) return;
    await fetch(`/api/admin/narratives?secret=${encodeURIComponent(secret)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    loadList();
  }

  function loadForEdit(n: StoredNarrative) {
    setCityName(n.cityName);
    setCitySlug(n.citySlug);
    setSlugEdited(true);
    setEditedIntro(n.intro);
    setEditedSummary(n.summaryText);
    setEditedBaseAreaName(n.baseAreaName);
    setEditedBaseAreaReason(n.baseAreaReason);
    setEditedActivity(n.activity ?? "");
    setEditedBestMonths(n.bestMonths ?? "");
    setSelected({ intro: n.intro, summaryText: n.summaryText, baseAreaName: n.baseAreaName, baseAreaReason: n.baseAreaReason, activity: n.activity, bestMonths: n.bestMonths });
    setGenStatus("done");
    setOptions(null);
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const savedSlugs = new Set(savedList?.map((n) => n.citySlug) ?? []);

  const filteredCities = search.trim()
    ? ALL_KNOWN_CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.includes(search.toLowerCase())
      )
    : ALL_KNOWN_CITIES;

  return (
    <div className="mb-8 rounded-xl border border-[#E4DDD2] bg-white px-5 py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#2E2A26]">City narratives</p>
          <span className="text-xs text-[#5F5A54]">— AI-generated intros & base area reasoning</span>
          {savedList && savedList.length > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
              {savedList.length} saved
            </span>
          )}
        </div>
        <span className="text-xs text-[#5F5A54]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">

          {/* ── City Picker ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">
                Select a city
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-40 rounded-lg border border-[#E4DDD2] bg-[#FAFAF8] px-2.5 py-1.5 text-xs text-[#2E2A26] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {filteredCities.map((c) => {
                const hasSaved = savedSlugs.has(c.slug);
                const hasStatic = STATIC_INTRO_SLUGS.includes(c.slug);
                const isActive = citySlug === c.slug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => pickCity(c.slug, c.name)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                      isActive
                        ? "bg-[#2E2A26] text-white border-[#2E2A26]"
                        : "bg-white text-[#2E2A26] border-[#E4DDD2] hover:bg-[#FAFAF8]"
                    }`}
                  >
                    {c.name}
                    {hasSaved && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? "bg-teal-400 text-white" : "bg-teal-100 text-teal-700"}`}>
                        KV
                      </span>
                    )}
                    {!hasSaved && hasStatic && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? "bg-amber-300 text-white" : "bg-amber-100 text-amber-700"}`}>
                        static
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredCities.length === 0 && (
                <p className="text-xs text-[#5F5A54]">No match — type any city name below and generate.</p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-stone-400">
              <span className="font-semibold text-teal-600">KV</span> = saved in Upstash (live on site) ·{" "}
              <span className="font-semibold text-amber-600">static</span> = hand-written in cityIntros.ts
            </p>
          </div>

          {/* ── Generator ────────────────────────────────────────────────── */}
          <div ref={generatorRef} className="rounded-xl border border-[#E4DDD2] bg-[#FAFAF8] p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">Generate</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">City name</label>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => { setCityName(e.target.value); setSlugEdited(false); }}
                  placeholder="Puerto Escondido"
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div className="w-48">
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">Slug</label>
                <input
                  type="text"
                  value={citySlug}
                  onChange={(e) => { setCitySlug(e.target.value); setSlugEdited(true); }}
                  placeholder="puerto-escondido"
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm font-mono text-[#2E2A26] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={genStatus === "loading" || !cityName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2E2A26] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {genStatus === "loading" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Fetching places + generating…
                </>
              ) : (
                <>✦ Generate with AI</>
              )}
            </button>

            {genStatus === "error" && genError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{genError}</p>
            )}
            {meta && (
              <p className="text-xs text-[#5F5A54]">
                Score: <strong>{meta.routineScore}/100</strong> · {meta.totalPlaces} places found
                {meta.baseCentroidAddress && <> · Base: <em>{meta.baseCentroidAddress}</em></>}
                {meta.confirmedCount > 0 && (
                  <> · <span className="text-teal-600">{meta.confirmedCount} user-confirmed</span></>
                )}
              </p>
            )}
          </div>

          {/* ── Options ──────────────────────────────────────────────────── */}
          {options && options.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">
                Choose a base area option
              </p>
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    selected === opt
                      ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100"
                      : "border-[#E4DDD2] bg-white hover:bg-[#FAFAF8]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#2E2A26]">
                    Option {i + 1}: {opt.baseAreaName}
                  </p>
                  <p className="mt-1 text-xs text-[#5F5A54] italic">{opt.baseAreaReason}</p>
                  <p className="mt-2 text-xs text-[#2E2A26] leading-5">{opt.intro}</p>
                </button>
              ))}
            </div>
          )}

          {/* ── Edit & Save ──────────────────────────────────────────────── */}
          {selected && (
            <div className="space-y-4 rounded-xl border border-[#E4DDD2] bg-[#FAFAF8] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">
                Review & edit before saving
              </p>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">Base area name</label>
                <input
                  type="text"
                  value={editedBaseAreaName}
                  onChange={(e) => setEditedBaseAreaName(e.target.value)}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">
                  Base area reason <span className="font-normal text-stone-400">(unlocked users)</span>
                </label>
                <textarea
                  value={editedBaseAreaReason}
                  onChange={(e) => setEditedBaseAreaReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">
                  Intro <span className="font-normal text-stone-400">(all users — shown above place list)</span>
                </label>
                <textarea
                  value={editedIntro}
                  onChange={(e) => setEditedIntro(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">
                  Summary text <span className="font-normal text-stone-400">(unlocked — RoutineSummaryCard)</span>
                </label>
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#5F5A54] mb-1">Activity</label>
                  <select
                    value={editedActivity}
                    onChange={(e) => setEditedActivity(e.target.value)}
                    className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] focus:outline-none"
                  >
                    <option value="">— none —</option>
                    <option value="surf">Surf</option>
                    <option value="dive">Dive</option>
                    <option value="hike">Hike</option>
                    <option value="yoga">Yoga</option>
                    <option value="kite">Kite</option>
                    <option value="work">Work / base</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#5F5A54] mb-1">Best months</label>
                  <input
                    type="text"
                    value={editedBestMonths}
                    onChange={(e) => setEditedBestMonths(e.target.value)}
                    placeholder="e.g. Apr – Oct"
                    className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className="rounded-lg bg-[#2E2A26] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {saveStatus === "saving" ? "Saving…" : "Save narrative"}
                </button>
                <button
                  onClick={() => { setSelected(null); setOptions(null); setGenStatus("idle"); }}
                  className="rounded-lg border border-[#E4DDD2] px-3 py-2.5 text-sm text-[#5F5A54] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
                {saveStatus === "saved" && (
                  <span className="text-xs font-medium text-teal-600">✓ Saved — live on the city page</span>
                )}
                {saveStatus === "error" && (
                  <span className="text-xs text-red-600">Save failed — is Upstash configured?</span>
                )}
              </div>
            </div>
          )}

          {/* ── Saved narratives list ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">
                Saved {savedList ? `(${savedList.length})` : ""}
              </p>
              <button onClick={loadList} className="text-xs text-[#5F5A54] hover:text-[#2E2A26]">
                ↻ Refresh
              </button>
            </div>
            {listLoading && <p className="text-xs text-[#5F5A54]">Loading…</p>}
            {!listLoading && savedList?.length === 0 && (
              <p className="text-xs text-[#5F5A54]">
                No saved narratives yet. Pick a city above and generate.
              </p>
            )}
            {savedList && savedList.length > 0 && (
              <div className="space-y-2">
                {savedList.map((n) => (
                  <div key={n.citySlug} className="flex items-start justify-between gap-3 rounded-lg border border-[#E4DDD2] bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2E2A26]">
                        {n.cityName}
                        <span className="ml-2 font-mono text-xs font-normal text-[#5F5A54]">{n.citySlug}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#5F5A54] italic truncate max-w-sm">
                        {n.baseAreaName} — {n.baseAreaReason}
                      </p>
                      <p className="mt-0.5 text-[10px] text-stone-400">
                        {new Date(n.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {n.editedAt && ` · edited ${new Date(n.editedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <a
                        href={`/city/${n.citySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-[#E4DDD2] px-2.5 py-1 text-xs text-[#5F5A54] hover:text-[#2E2A26]"
                      >
                        Preview ↗
                      </a>
                      <button
                        onClick={() => loadForEdit(n)}
                        className="rounded border border-[#E4DDD2] px-2.5 py-1 text-xs text-[#5F5A54] hover:text-[#2E2A26]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(n.citySlug)}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
