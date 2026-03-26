"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { City } from "@/types";
import type { AutocompleteSuggestion } from "@/app/api/autocomplete/route";

type Status = "idle" | "loading" | "error";

function buildCityParams(city: City): URLSearchParams {
  const params = new URLSearchParams({
    lat: city.lat.toString(),
    lon: city.lon.toString(),
    name: city.name,
    country: city.country,
  });
  if (city.parentCity) params.set("parentCity", city.parentCity);
  if (city.bbox) params.set("bbox", city.bbox.join(","));
  return params;
}

export function CitySearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced autocomplete fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
          setShowDropdown(true);
          setActiveIndex(-1);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch {
        // Fail silently — search still works via form submit
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateToCity(city: City) {
    track("city_search_submitted", {
      city_slug: city.slug,
      city_name: city.name,
      country: city.country,
    });
    setShowDropdown(false);
    router.push(`/city/${city.slug}?${buildCityParams(city).toString()}`);
  }

  function selectSuggestion(suggestion: AutocompleteSuggestion) {
    setQuery(
      suggestion.city.parentCity
        ? `${suggestion.label}, ${suggestion.city.parentCity}`
        : suggestion.label
    );
    navigateToCity(suggestion.city);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setShowDropdown(false);

    // If a suggestion is highlighted, select it
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

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
            ? "Place not found. Try a city or neighbourhood name."
            : "Something went wrong. Please try again."
        );
        return;
      }

      const city: City = data.city;
      navigateToCity(city);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the geocoding service. Please try again.");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  const isLoading = status === "loading";

  const TYPE_COLORS: Record<AutocompleteSuggestion["typeLabel"], string> = {
    Neighborhood: "bg-mist text-teal",
    District: "bg-mist text-teal",
    Area: "bg-mist text-teal",
    City: "bg-sand text-umber",
  };

  return (
    <div className="w-full max-w-lg" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="e.g. Lisbon, El Poblado, Shoreditch"
            disabled={isLoading}
            className="w-full rounded-xl border border-dune bg-white px-4 py-3 text-base text-bark shadow-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-60"
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-activedescendant={
              activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
            }
          />

          {showDropdown && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-dune bg-white shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.city.slug}-${i}`}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click
                    selectSuggestion(s);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                    i === activeIndex ? "bg-sand" : "hover:bg-sand/60"
                  } ${i > 0 ? "border-t border-dune" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-bark">{s.label}</p>
                    {s.sublabel && (
                      <p className="truncate text-xs text-umber">{s.sublabel}</p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[s.typeLabel]}`}
                  >
                    {s.typeLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="w-full rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-teal disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[110px]"
        >
          {isLoading ? "Searching…" : "Map my routine"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
