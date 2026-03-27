"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type Category = "work" | "food" | "wellbeing";

interface Props {
  citySlug: string;
  neighborhoodSlug?: string;
  sectionCategory: Category;
}

const MAPS_URL_RE = /maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|google\.[a-z.]+\/maps/i;

function validateMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return MAPS_URL_RE.test(parsed.href);
  } catch {
    return false;
  }
}

const STORAGE_KEY_PREFIX = "ts_suggested_";

export function SuggestPlace({ citySlug, neighborhoodSlug = "", sectionCategory }: Props) {
  const storageKey = `${STORAGE_KEY_PREFIX}${citySlug}_${sectionCategory}`;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [category, setCategory] = useState<Category>(sectionCategory);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (name.trim().length > 100) errs.name = "Max 100 characters.";
    if (!mapsUrl.trim()) errs.mapsUrl = "Google Maps link is required.";
    else if (!validateMapsUrl(mapsUrl.trim())) errs.mapsUrl = "Paste a valid Google Maps link.";
    if (note.length > 200) errs.note = "Max 200 characters.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    setFieldErrors({});

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mapsUrl: mapsUrl.trim(),
          category,
          note: note.trim() || null,
          citySlug,
          neighborhoodSlug,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFieldErrors({ form: data.error ?? "Submission failed." });
        setStatus("idle");
        return;
      }

      setStatus("done");
      track("place_suggested", { citySlug, category, neighborhoodSlug });
      try { localStorage.setItem(storageKey, "done"); } catch {}
    } catch {
      setFieldErrors({ form: "Network error — try again." });
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700">
        ✓ Thanks — we&rsquo;ll review it.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-xs text-umber/70 underline underline-offset-2 transition-colors hover:text-bark"
      >
        + Suggest a missing spot
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-2xl border border-dune bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-bark">Suggest a missing spot</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-umber/60 hover:text-bark"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-umber mb-1">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name of the place"
          maxLength={100}
          className="w-full rounded-lg border border-dune bg-cream px-3 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
        )}
      </div>

      {/* Maps URL */}
      <div>
        <label className="block text-xs font-medium text-umber mb-1">
          Google Maps link <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          className="w-full rounded-lg border border-dune bg-cream px-3 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        {fieldErrors.mapsUrl && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.mapsUrl}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-umber mb-1">
          Category <span className="text-red-400">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-lg border border-dune bg-cream px-3 py-2.5 text-sm text-bark focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option value="work">Work spot</option>
          <option value="food">Café / meals</option>
          <option value="wellbeing">Gym / wellbeing</option>
        </select>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-umber mb-1">
          Note <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything useful: wifi speed, hours, vibe…"
          maxLength={200}
          rows={2}
          className="w-full rounded-lg border border-dune bg-cream px-3 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
        />
        <p className="mt-0.5 text-right text-xs text-stone-400">{note.length}/200</p>
        {fieldErrors.note && (
          <p className="mt-1 text-xs text-red-500">{fieldErrors.note}</p>
        )}
      </div>

      {fieldErrors.form && (
        <p className="text-xs text-red-500">{fieldErrors.form}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-bark px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "…" : "Submit suggestion →"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-dune px-3 py-2.5 text-sm text-umber hover:bg-cream"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
