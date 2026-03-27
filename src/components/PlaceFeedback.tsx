"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  placeId: string;
  placeName: string;
  citySlug: string;
}

const ISSUES = [
  { value: "closed", label: "Permanently closed" },
  { value: "wifi", label: "Wi-Fi doesn't work" },
  { value: "hours", label: "Wrong opening hours" },
  { value: "location", label: "Wrong location" },
  { value: "other", label: "Other issue" },
] as const;

type IssueValue = (typeof ISSUES)[number]["value"];

function storageKey(placeId: string) {
  return `ts_fb_${placeId}`;
}

export function PlaceFeedback({ placeId, placeName, citySlug }: Props) {
  const [done, setDone] = useState<"confirm" | "report" | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read prior state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(placeId));
      if (stored === "confirm" || stored === "report") setDone(stored);
    } catch {}
  }, [placeId]);

  // Close dropdown when clicking outside
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
      // silent — never break the page over feedback
    }
    setDone(type);
    setLoading(false);
    try {
      localStorage.setItem(storageKey(placeId), type);
    } catch {}
  }

  if (done) {
    return (
      <p className="text-xs text-teal-600 font-medium">
        {done === "confirm" ? "✓ Thanks" : "✓ Reported"}
      </p>
    );
  }

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Thumbs up */}
      <button
        onClick={() => !loading && submit("confirm")}
        disabled={loading}
        title="Still good — confirm this place"
        className="text-stone-400 hover:text-teal-600 transition-colors disabled:opacity-40"
        aria-label="Confirm this place is still accurate"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 0 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-2.096 7.34c-.230.520-.752.853-1.327.853H9.626c-.619 0-1.12-.499-1.12-1.116V9.958c0-.31.128-.607.354-.818A5.26 5.26 0 0 0 10.35 7.5c.355-.714.55-1.52.55-2.35-.001-.468-.127-.909-.35-1.287A1 1 0 0 1 11 3Z" />
        </svg>
      </button>

      {/* Flag */}
      <div className="relative">
        <button
          onClick={() => !loading && setShowDropdown((v) => !v)}
          disabled={loading}
          title="Report an issue with this place"
          className="text-stone-400 hover:text-red-400 transition-colors disabled:opacity-40"
          aria-label="Report an issue with this place"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 4.271.572 7.948 7.948 0 0 0 5.965.524l2.078-.64A.75.75 0 0 0 18 12.25v-8.5a.75.75 0 0 0-.904-.734l-2.38.501a7.25 7.25 0 0 1-4.186-.363l-.502-.2a8.75 8.75 0 0 0-5.053-.439L3.5 3.16V2.75Z" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute bottom-full right-0 mb-2 z-30 w-48 rounded-xl border border-dune bg-white shadow-lg py-1">
            {ISSUES.map((issue) => (
              <button
                key={issue.value}
                onClick={() => submit("report", issue.value)}
                className="w-full px-4 py-2.5 text-left text-xs text-umber hover:bg-sand transition-colors"
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
