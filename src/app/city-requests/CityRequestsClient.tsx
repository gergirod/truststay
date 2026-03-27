"use client";

import { useState, useEffect } from "react";
import { track } from "@/lib/analytics";

export interface CityRequest {
  slug: string;
  name: string;
  country: string;
  region: Region;
  votes: number;
}

type Region = "All" | "Mexico" | "Central America" | "Caribbean" | "South America" | "Beyond LATAM";

const REGIONS: { label: Region; flag: string }[] = [
  { label: "All",            flag: "🌎" },
  { label: "Mexico",         flag: "🇲🇽" },
  { label: "Central America",flag: "🌴" },
  { label: "Caribbean",      flag: "🏝️" },
  { label: "South America",  flag: "🌿" },
  { label: "Beyond LATAM",   flag: "🌍" },
];

function voteKey(slug: string) {
  return `ts_voted_${slug}`;
}

interface Props {
  seed: CityRequest[];
  highlightSlug?: string;
}

export function CityRequestsClient({ seed, highlightSlug }: Props) {
  const [region, setRegion] = useState<Region>("All");
  const [cities, setCities] = useState<CityRequest[]>(seed);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  // Request form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  // Load prior votes from localStorage
  useEffect(() => {
    const seen = new Set<string>();
    try {
      seed.forEach((c) => {
        if (localStorage.getItem(voteKey(c.slug)) === "1") seen.add(c.slug);
      });
    } catch {}
    setVoted(seen);
  }, [seed]);

  // Scroll to highlighted city
  useEffect(() => {
    if (!highlightSlug) return;
    const el = document.getElementById(`city-${highlightSlug}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightSlug]);

  async function handleVote(city: CityRequest) {
    if (voted.has(city.slug)) return;

    // Optimistic
    setCities((prev) =>
      prev.map((c) => (c.slug === city.slug ? { ...c, votes: c.votes + 1 } : c))
    );
    setVoted((prev) => new Set([...prev, city.slug]));
    try { localStorage.setItem(voteKey(city.slug), "1"); } catch {}

    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug: city.slug, cityName: city.name, country: city.country, action: "vote" }),
      });
      track("city_vote", { city_slug: city.slug, city_name: city.name });
    } catch {
      // revert on failure
      setCities((prev) =>
        prev.map((c) => (c.slug === city.slug ? { ...c, votes: c.votes - 1 } : c))
      );
      setVoted((prev) => { const s = new Set(prev); s.delete(city.slug); return s; });
      try { localStorage.removeItem(voteKey(city.slug)); } catch {}
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormStatus("loading");

    const slug = formName.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Optimistic — add to list
    const newCity: CityRequest = {
      slug,
      name: formName.trim(),
      country: formCountry.trim() || "Unknown",
      region: "All" as Region,
      votes: 1,
    };
    setCities((prev) => [newCity, ...prev]);
    setVoted((prev) => new Set([...prev, slug]));
    try { localStorage.setItem(voteKey(slug), "1"); } catch {}

    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citySlug: slug, cityName: formName.trim(), country: formCountry.trim(), action: "request" }),
      });
      track("city_requested", { city_slug: slug, city_name: formName.trim() });
    } catch {}

    setFormStatus("done");
    setFormName("");
    setFormCountry("");
    setTimeout(() => { setFormStatus("idle"); setShowForm(false); }, 2000);
  }

  const filtered = region === "All"
    ? cities
    : cities.filter((c) => c.region === region);

  const sorted = [...filtered].sort((a, b) => b.votes - a.votes);

  return (
    <div>
      {/* Request form */}
      <div className="mb-8">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-dune bg-white px-5 py-3 text-sm font-medium text-bark shadow-sm transition-colors hover:bg-cream"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-teal-500">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Request a city
          </button>
        ) : formStatus === "done" ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-sm font-medium text-teal-700">
            ✓ Added — thanks for the suggestion!
          </div>
        ) : (
          <form
            onSubmit={handleRequest}
            className="flex flex-col gap-3 rounded-xl border border-dune bg-white p-5 shadow-sm sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
              <input
                autoFocus
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="City or town name"
                required
                className="w-full rounded-lg border border-dune bg-cream px-4 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 sm:flex-1"
              />
              <input
                type="text"
                value={formCountry}
                onChange={(e) => setFormCountry(e.target.value)}
                placeholder="Country"
                className="w-full rounded-lg border border-dune bg-cream px-4 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 sm:w-40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formStatus === "loading" || !formName.trim()}
                className="rounded-lg bg-bark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {formStatus === "loading" ? "…" : "Submit"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-dune px-3 py-2.5 text-sm text-umber transition-colors hover:bg-cream"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Region filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <button
            key={r.label}
            onClick={() => setRegion(r.label)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              region === r.label
                ? "bg-bark text-white"
                : "border border-dune bg-white text-umber hover:bg-cream"
            }`}
          >
            <span>{r.flag}</span>
            {r.label}
          </button>
        ))}
      </div>

      {/* City list */}
      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-umber">No cities in this region yet.</p>
        )}
        {sorted.map((city) => {
          const hasVoted = voted.has(city.slug);
          const isHighlighted = city.slug === highlightSlug;
          return (
            <div
              key={city.slug}
              id={`city-${city.slug}`}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-4 transition-colors ${
                isHighlighted ? "border-teal-300 ring-2 ring-teal-100" : "border-dune"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-bark">{city.name}</p>
                <p className="mt-0.5 text-xs text-umber">{city.country}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold text-bark tabular-nums">
                  {city.votes.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-stone-400">votes</span>
                </span>
                <button
                  onClick={() => handleVote(city)}
                  disabled={hasVoted}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                    hasVoted
                      ? "bg-teal-50 text-teal-700 cursor-default"
                      : "bg-bark text-white hover:opacity-90"
                  }`}
                >
                  {hasVoted ? "Voted ✓" : "Vote"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
