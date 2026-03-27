"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  placeId: string;
  placeName: string;
  citySlug: string;
}

const ISSUES = [
  { value: "closed",   label: "Permanently closed" },
  { value: "wifi",     label: "Wi-Fi doesn't work" },
  { value: "hours",    label: "Wrong opening hours" },
  { value: "location", label: "Wrong location" },
  { value: "other",    label: "Other issue" },
] as const;

type IssueValue = (typeof ISSUES)[number]["value"];

function storageKey(id: string) {
  return `ts_fb_${id}`;
}

export function PlaceFeedback({ placeId, placeName, citySlug }: Props) {
  const [done, setDone] = useState<"confirm" | "report" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(placeId));
      if (stored === "confirm" || stored === "report") setDone(stored);
    } catch {}
  }, [placeId]);

  useEffect(() => {
    if (!showDropdown) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  async function submit(type: "confirm" | "report", issue?: IssueValue) {
    setLoading(true);
    setShowDropdown(false);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, issue: issue ?? null, placeId, placeName, citySlug }),
      });
    } catch {
      // silent
    }
    setDone(type);
    setLoading(false);
    try { localStorage.setItem(storageKey(placeId), type); } catch {}
  }

  // ── Already actioned ──────────────────────────────────────────────────────
  if (done === "confirm") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
        Thanks for confirming
      </span>
    );
  }

  if (done === "report") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
        ✓ Reported — we&apos;ll review it
      </span>
    );
  }

  // ── Default state ──────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      <span className="text-xs text-stone-400">Still accurate?</span>

      {/* Confirm pill */}
      <button
        onClick={() => !loading && submit("confirm")}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
        Yes, still good
      </button>

      {/* Report pill + dropdown */}
      <div className="relative">
        <button
          onClick={() => !loading && setShowDropdown((v) => !v)}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-dune bg-white px-3 py-1 text-xs font-medium text-umber transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:opacity-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-stone-400"><path d="M2.5 2A1.5 1.5 0 0 0 1 3.5v.793c.026.009.051.02.076.032L7.674 7.08a1.75 1.75 0 0 0 .652.17v6.087a1.505 1.505 0 0 1-.978-.396l-5.5-5a1.5 1.5 0 0 1-.848-1.353V6.5h-.001a1.5 1.5 0 0 1 .001-.129V3.5A1.5 1.5 0 0 1 2.5 2ZM15 3.5A1.5 1.5 0 0 0 13.5 2H6l9 4.11V3.5Z" /></svg>
          Report issue
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-stone-300"><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
        </button>

        {showDropdown && (
          <div className="absolute bottom-full right-0 mb-2 z-30 w-52 rounded-xl border border-dune bg-white shadow-lg py-1.5 overflow-hidden">
            <p className="px-4 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              What&apos;s the issue?
            </p>
            {ISSUES.map((issue) => (
              <button
                key={issue.value}
                onClick={() => submit("report", issue.value)}
                className="w-full px-4 py-2 text-left text-xs text-umber hover:bg-sand transition-colors"
              >
                {issue.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
