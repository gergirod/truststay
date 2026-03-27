"use client";

import { useState, useEffect } from "react";

interface CacheMeta {
  citySlug: string;
  cityName: string;
  cachedAt: string;
  counts: { work: number; food: number; wellbeing: number; total: number };
}

export function CachedPlaces({ secret }: { secret: string }) {
  const [open, setOpen] = useState(false);
  const [caches, setCaches] = useState<CacheMeta[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/places?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      setCaches(data.caches ?? []);
    } catch {
      setCaches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvalidate(slug: string) {
    if (!confirm(`Invalidate place cache for "${slug}"? The next page load will re-fetch from Overpass and re-save.`)) return;
    setDeleting(slug);
    await fetch(`/api/admin/places?secret=${encodeURIComponent(secret)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    setDeleting(null);
    load();
  }

  function ago(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }

  return (
    <div className="mb-8 rounded-xl border border-[#E4DDD2] bg-white px-5 py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#2E2A26]">Cached places</p>
          <span className="text-xs text-[#5F5A54]">
            — persisted place lists (KV) · auto-saved on first page load
          </span>
          {caches && caches.length > 0 && (
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
              {caches.length} cities
            </span>
          )}
        </div>
        <span className="text-xs text-[#5F5A54]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#5F5A54]">
              Places are cached for <strong>14 days</strong> after first load.
              Invalidating forces a fresh Overpass fetch on the next visit — the new
              result is saved automatically.
            </p>
            <button onClick={load} className="shrink-0 text-xs text-[#5F5A54] hover:text-[#2E2A26]">
              ↻ Refresh
            </button>
          </div>

          {loading && <p className="text-xs text-[#5F5A54]">Loading…</p>}

          {!loading && caches?.length === 0 && (
            <p className="text-xs text-[#5F5A54]">
              No cached cities yet — place lists are saved automatically the first
              time each city page is loaded while Upstash is configured.
            </p>
          )}

          {caches && caches.length > 0 && (
            <div className="space-y-2">
              {caches.map((c) => (
                <div
                  key={c.citySlug}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#E4DDD2] bg-white px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#2E2A26]">{c.cityName}</span>
                      <span className="font-mono text-xs text-[#5F5A54]">{c.citySlug}</span>
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] text-teal-700 font-medium">
                        {c.counts.total} places
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-stone-400">
                      Cached {ago(c.cachedAt)} ·{" "}
                      {c.counts.work} work · {c.counts.food} food · {c.counts.wellbeing} wellbeing
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/city/${c.citySlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-[#E4DDD2] px-2.5 py-1 text-xs text-[#5F5A54] hover:text-[#2E2A26]"
                    >
                      Preview ↗
                    </a>
                    <button
                      onClick={() => handleInvalidate(c.citySlug)}
                      disabled={deleting === c.citySlug}
                      className="rounded border border-amber-200 px-2.5 py-1 text-xs text-amber-600 hover:text-amber-800 disabled:opacity-40"
                    >
                      {deleting === c.citySlug ? "…" : "Invalidate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
