"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { City } from "@/types";

type Status = "idle" | "loading" | "error";

export function CitySearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(
          res.status === 404
            ? "City not found. Try a different name or spelling."
            : "Something went wrong. Please try again."
        );
        return;
      }

      const city: City = data.city;
      track("city_search_submitted", {
        city_slug: city.slug,
        city_name: city.name,
        country: city.country,
      });

      const params = new URLSearchParams({
        lat: city.lat.toString(),
        lon: city.lon.toString(),
        name: city.name,
        country: city.country,
      });

      router.push(`/city/${city.slug}?${params.toString()}`);
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the geocoding service. Please try again.");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="e.g. Lisbon, Medellín, Chiang Mai"
          disabled={isLoading}
          className="flex-1 rounded-xl border border-dune bg-white px-4 py-3 text-base text-bark shadow-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sage disabled:opacity-60"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="w-full rounded-xl bg-bark px-5 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[110px]"
        >
          {isLoading ? "Searching…" : "Find setup"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
