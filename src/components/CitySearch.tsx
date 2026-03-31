"use client";

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { City, StayPurpose, WorkStyle, DailyBalance } from "@/types";
import type { AutocompleteSuggestion } from "@/app/api/autocomplete/route";
import { IntentLoadingCard } from "@/components/IntentLoadingCard";
import { EmailCapture } from "@/components/EmailCapture";

type Status = "idle" | "loading" | "error";
type IntentStep = "purpose" | "workStyle" | "dailyBalance";

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

const PURPOSES: { value: StayPurpose; label: string; emoji: string }[] = [
  { value: "surf",       label: "Surf",       emoji: "🏄" },
  { value: "dive",       label: "Dive",       emoji: "🤿" },
  { value: "hike",       label: "Hike",       emoji: "🥾" },
  { value: "yoga",       label: "Yoga",       emoji: "🧘" },
  { value: "kite",       label: "Kite",       emoji: "🪁" },
  { value: "work_first", label: "Work first", emoji: "💻" },
  { value: "exploring",  label: "Exploring",  emoji: "🌎" },
];

const PURPOSE_MAP = Object.fromEntries(PURPOSES.map((p) => [p.value, p])) as unknown as Record<
  StayPurpose, { label: string; emoji: string }
>;

const WORK_STYLES: { value: WorkStyle; label: string; hint: string }[] = [
  { value: "light",    label: "Light",    hint: "A few focused hours" },
  { value: "balanced", label: "Balanced", hint: "Half workdays" },
  { value: "heavy",    label: "Heavy",    hint: "Full remote" },
];

const DAILY_BALANCES: { value: DailyBalance; label: string; hint: string }[] = [
  { value: "purpose_first", label: "Purpose-first", hint: "Shape days around why I came" },
  { value: "balanced",      label: "Balanced",      hint: "Work and life both matter" },
  { value: "work_first",    label: "Work-first",    hint: "Protect work first" },
];

// ── Intent Modal ─────────────────────────────────────────────────────────────

interface IntentModalProps {
  city: City;
  onComplete: (purpose: StayPurpose, workStyle: WorkStyle, dailyBalance: DailyBalance) => void;
  onSkip: () => void;
}

function IntentModal({ city, onComplete, onSkip }: IntentModalProps) {
  const [step, setStep] = useState<IntentStep>("purpose");
  const [selPurpose, setSelPurpose] = useState<StayPurpose | null>(null);
  const [selWorkStyle, setSelWorkStyle] = useState<WorkStyle | null>(null);
  const [loading, setLoading] = useState(false);

  const purposeInfo = selPurpose ? PURPOSE_MAP[selPurpose] : null;
  const workInfo = selWorkStyle ? WORK_STYLES.find((w) => w.value === selWorkStyle) : null;

  function handlePurpose(p: StayPurpose) {
    setSelPurpose(p);
    track("intent_purpose_selected", { purpose: p, source: "search_form" });
    setStep("workStyle");
  }

  function handleWorkStyle(w: WorkStyle) {
    setSelWorkStyle(w);
    if (!selPurpose) return;
    if (selPurpose === "work_first") {
      setLoading(true);
      onComplete(selPurpose, w, "work_first");
    } else {
      setStep("dailyBalance");
    }
  }

  function handleDailyBalance(b: DailyBalance) {
    if (!selPurpose || !selWorkStyle) return;
    setLoading(true);
    onComplete(selPurpose, selWorkStyle, b);
  }

  const content = loading && selPurpose && selWorkStyle ? (
    <IntentLoadingCard purpose={selPurpose} workStyle={selWorkStyle} cityName={city.name} />
  ) : (
    <div className="rounded-2xl border border-dune bg-white shadow-2xl overflow-hidden w-full max-w-sm">
      {/* Teal accent bar */}
      <div className="h-[3px] bg-teal" />

      <div className="px-6 py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal truncate">
              {city.name}
            </p>

            {step === "purpose" && (
              <p className="mt-1 text-base font-semibold text-bark">
                What brought you here?
              </p>
            )}
            {step === "workStyle" && (
              <div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-base leading-none" aria-hidden="true">{purposeInfo?.emoji}</span>
                  <span className="text-sm font-semibold text-bark">{purposeInfo?.label}</span>
                  <span className="text-umber/40">·</span>
                  <span className="text-sm font-semibold text-bark">How work-heavy is this stay?</span>
                </div>
                <button
                  onClick={() => setStep("purpose")}
                  className="mt-1 text-[11px] text-umber/50 hover:text-umber transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
            {step === "dailyBalance" && (
              <div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-base leading-none" aria-hidden="true">{purposeInfo?.emoji}</span>
                  <span className="text-sm font-semibold text-bark">{purposeInfo?.label}</span>
                  <span className="text-umber/40">·</span>
                  <span className="text-sm text-umber">{workInfo?.label}</span>
                  <span className="text-umber/40">·</span>
                  <span className="text-sm font-semibold text-bark">How do you want this stay to feel?</span>
                </div>
                <button
                  onClick={() => setStep("workStyle")}
                  className="mt-1 text-[11px] text-umber/50 hover:text-umber transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>

          {/* Close / skip */}
          <button
            onClick={onSkip}
            className="shrink-0 rounded-lg p-1.5 text-umber/40 hover:bg-sand hover:text-bark transition-colors"
            aria-label="Skip and go to city"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Step: purpose */}
        {step === "purpose" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {PURPOSES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => handlePurpose(value)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dune bg-white px-1.5 py-2.5 text-center transition-all hover:border-teal/60 hover:bg-mist active:scale-95"
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span className="text-[11px] font-medium text-bark leading-tight">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onSkip}
                className="text-[11px] text-umber/40 hover:text-umber/70 transition-colors"
              >
                Skip — just show me {city.name}
              </button>
            </div>
          </>
        )}

        {/* Step: work style */}
        {step === "workStyle" && (
          <div className="grid grid-cols-3 gap-2">
            {WORK_STYLES.map(({ value, label, hint }) => (
              <button
                key={value}
                onClick={() => handleWorkStyle(value)}
                className="flex flex-col rounded-xl border border-dune bg-white px-3 py-3 text-left transition-all hover:border-teal/60 hover:bg-mist active:scale-95"
              >
                <span className="text-sm font-semibold text-bark">{label}</span>
                <span className="mt-0.5 text-[11px] leading-4 text-umber">{hint}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step: daily balance */}
        {step === "dailyBalance" && (
          <div className="grid grid-cols-3 gap-2">
            {DAILY_BALANCES.map(({ value, label, hint }) => (
              <button
                key={value}
                onClick={() => handleDailyBalance(value)}
                className="flex flex-col rounded-xl border border-dune bg-white px-3 py-3 text-left transition-all hover:border-teal/60 hover:bg-mist active:scale-95"
              >
                <span className="text-sm font-semibold text-bark">{label}</span>
                <span className="mt-0.5 text-[11px] leading-4 text-umber">{hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Plan your stay in ${city.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bark/50 backdrop-blur-[2px]"
        onClick={!loading ? onSkip : undefined}
      />
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-sm">
        {content}
      </div>
    </div>,
    document.body
  );
}

// ── CitySearch ────────────────────────────────────────────────────────────────

export function CitySearch() {
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState(
    "e.g. Puerto Escondido, Santa Teresa, Popoyo",
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingCity, setPendingCity] = useState<City | null>(null);
  const [notFoundLead, setNotFoundLead] = useState<{ cityName: string; citySlug: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function loadHints() {
      try {
        const res = await fetch("/api/search-hints", { cache: "no-store" });
        const data = (await res.json()) as { examples?: string[] };
        if (!cancelled && data.examples && data.examples.length > 0) {
          setPlaceholder(`e.g. ${data.examples.slice(0, 3).join(", ")}`);
        }
      } catch {
        // Keep default placeholder on hint fetch failure.
      }
    }
    loadHints();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(trimmed)}`);
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
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateToCity(
    city: City,
    intent?: { purpose: StayPurpose; workStyle: WorkStyle; dailyBalance: DailyBalance }
  ) {
    const params = buildCityParams(city);
    if (intent) {
      params.set("purpose", intent.purpose);
      params.set("workStyle", intent.workStyle);
      params.set("dailyBalance", intent.dailyBalance);
    }
    track("city_search_submitted", {
      city_slug: city.slug,
      city_name: city.name,
      country: city.country,
      intent_purpose: intent?.purpose ?? null,
      intent_work_style: intent?.workStyle ?? null,
      intent_daily_balance: intent?.dailyBalance ?? null,
    });
    router.push(`/city/${city.slug}?${params.toString()}`);
  }

  function openIntentModal(city: City) {
    setShowDropdown(false);
    setPendingCity(city);
  }

  function selectSuggestion(suggestion: AutocompleteSuggestion) {
    setQuery(
      suggestion.city.parentCity
        ? `${suggestion.label}, ${suggestion.city.parentCity}`
        : suggestion.label
    );
    openIntentModal(suggestion.city);
  }

  function handleModalComplete(p: StayPurpose, w: WorkStyle, b: DailyBalance) {
    if (!pendingCity) return;
    track("intent_prompt_completed", { purpose: p, workStyle: w, daily_balance: b, source: "search_form" });
    navigateToCity(pendingCity, { purpose: p, workStyle: w, dailyBalance: b });
  }

  function handleModalSkip() {
    if (!pendingCity) return;
    const city = pendingCity;
    setPendingCity(null);
    track("intent_prompt_dismissed", { source: "search_form" });
    navigateToCity(city);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setShowDropdown(false);
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");
    setNotFoundLead(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        if (res.status === 404) {
          const citySlug = trimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          setNotFoundLead({ cityName: trimmed, citySlug });
          setErrorMsg("This place is not available yet.");
        } else {
          setErrorMsg("Something went wrong. Please try again.");
        }
        return;
      }
      setStatus("idle");
      setNotFoundLead(null);
      openIntentModal(data.city as City);
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the geocoding service. Please try again.");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape") { setShowDropdown(false); setActiveIndex(-1); }
  }

  const isLoading = status === "loading";

  const TYPE_COLORS: Record<AutocompleteSuggestion["typeLabel"], string> = {
    Neighborhood: "bg-mist text-teal",
    District: "bg-mist text-teal",
    Area: "bg-mist text-teal",
    City: "bg-sand text-umber",
  };

  return (
    <>
      {/* The search bar — never changes shape or height */}
      <div className="w-full max-w-lg" ref={containerRef}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (status === "error") setStatus("idle"); }}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full rounded-xl border border-dune bg-white px-4 py-3 text-base text-bark shadow-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-60"
              autoComplete="off"
              spellCheck={false}
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
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
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                      i === activeIndex ? "bg-sand" : "hover:bg-sand/60"
                    } ${i > 0 ? "border-t border-dune" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-bark">{s.label}</p>
                      {s.sublabel && <p className="truncate text-xs text-umber">{s.sublabel}</p>}
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[s.typeLabel]}`}>
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
            className="w-full rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-teal disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[130px]"
          >
            {isLoading ? "Searching…" : "Find my best base"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
        )}

        {notFoundLead && (
          <div className="mt-4">
            <EmailCapture
              context="homepage"
              citySlug={notFoundLead.citySlug}
              cityName={notFoundLead.cityName}
              prompt={`We are not in ${notFoundLead.cityName} yet. Leave your email and we will notify you when it is available.`}
            />
          </div>
        )}
      </div>

      {/* Intent modal — floats above everything, hero stays stable */}
      {pendingCity && (
        <IntentModal
          city={pendingCity}
          onComplete={handleModalComplete}
          onSkip={handleModalSkip}
        />
      )}
    </>
  );
}
