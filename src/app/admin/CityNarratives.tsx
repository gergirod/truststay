"use client";

import { useState, useEffect } from "react";
import type { StoredNarrative } from "@/lib/kv";
import type { NarrativeOption } from "@/lib/narrativeAI";

interface Props {
  secret: string;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function CityNarratives({ secret }: Props) {
  const [open, setOpen] = useState(false);
  const [cityName, setCityName] = useState("");
  const [citySlug, setCitySlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const [genStatus, setGenStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [options, setOptions] = useState<NarrativeOption[] | null>(null);
  const [meta, setMeta] = useState<{ routineScore: number; totalPlaces: number; baseCentroidAddress: string | null; confirmedCount: number } | null>(null);

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
          kv_not_configured: "Upstash KV not configured — narrative generated but cannot be saved.",
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
      if (data.ok) {
        setSaveStatus("saved");
        loadList();
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mb-8 rounded-xl border border-[#E4DDD2] bg-white px-5 py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#2E2A26]">City narratives</p>
          <span className="text-xs text-[#5F5A54]">— AI-generated intros & base area reasoning</span>
        </div>
        <span className="text-xs text-[#5F5A54]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">

          {/* ── Generator ────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-[#E4DDD2] bg-[#FAFAF8] p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">Generate</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">City name</label>
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
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
                {meta.baseCentroidAddress && <> · Base area: <em>{meta.baseCentroidAddress}</em></>}
                {meta.confirmedCount > 0 && <> · <span className="text-teal-600">{meta.confirmedCount} user-confirmed place{meta.confirmedCount > 1 ? "s" : ""}</span></>}
              </p>
            )}
          </div>

          {/* ── Options ──────────────────────────────────────────────────── */}
          {options && options.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">Choose a base area option</p>
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
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5A54]">Review & edit before saving</p>

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
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">Base area reason <span className="font-normal">(shown to unlocked users)</span></label>
                <textarea
                  value={editedBaseAreaReason}
                  onChange={(e) => setEditedBaseAreaReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">Intro <span className="font-normal">(shown to all users)</span></label>
                <textarea
                  value={editedIntro}
                  onChange={(e) => setEditedIntro(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[#E4DDD2] bg-white px-3 py-2 text-sm text-[#2E2A26] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5F5A54] mb-1">Summary text <span className="font-normal">(shown to unlocked users)</span></label>
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
                Saved narratives {savedList ? `(${savedList.length})` : ""}
              </p>
              <button onClick={loadList} className="text-xs text-[#5F5A54] hover:text-[#2E2A26]">
                ↻ Refresh
              </button>
            </div>

            {listLoading && <p className="text-xs text-[#5F5A54]">Loading…</p>}

            {!listLoading && savedList && savedList.length === 0 && (
              <p className="text-xs text-[#5F5A54]">
                No saved narratives yet.{!process.env.NEXT_PUBLIC_UPSTASH_CONFIGURED && " (Upstash KV not configured — add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)"}
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
                        Generated {new Date(n.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {n.editedAt && ` · Edited ${new Date(n.editedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
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
                        Delete
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
