"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CitySearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    // Temporary slug — real geocoding replaces this in Task 02
    const slug = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    router.push(`/city/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Lisbon, Medellín, Chiang Mai"
        className="flex-1 rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={!query.trim()}
        className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find setup
      </button>
    </form>
  );
}
