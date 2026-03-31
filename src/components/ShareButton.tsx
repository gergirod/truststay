"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

interface Props {
  cityName: string;
  citySlug: string;
  neighborhoodName: string;
  routineScore?: number;
}

export function ShareButton({
  cityName,
  citySlug,
  neighborhoodName,
  routineScore,
}: Props) {
  const [copied, setCopied] = useState(false);

  function buildCleanShareUrl(): string {
    const origin = window.location.origin;
    // Share only the destination path so recipients land like a fresh visitor.
    return `${origin}/city/${encodeURIComponent(citySlug)}`;
  }

  const handleShare = async () => {
    const url = buildCleanShareUrl();
    const text = `Best base for remote workers in ${cityName}: ${neighborhoodName}${
      routineScore ? ` — routine score ${routineScore}/100` : ""
    }. Truststay`;

    const method = typeof navigator.share === "function" ? "native" : "clipboard";

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${neighborhoodName}, ${cityName} — Truststay`,
          text,
          url,
        });
      } catch {
        // user cancelled or browser blocked — no-op
        return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    track("neighborhood_shared", {
      city_slug: citySlug,
      neighborhood_name: neighborhoodName,
      method,
    });
  };

  return (
    <button
      onClick={handleShare}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-dune bg-cream px-3 py-1.5 text-xs font-medium text-umber transition-colors hover:bg-dune"
      aria-label="Share this neighborhood recommendation"
    >
      {copied ? (
        <span className="text-teal-600 font-medium">Link copied ✓</span>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5 opacity-60"
            aria-hidden="true"
          >
            <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.474L13.03 5.13A2.5 2.5 0 0 1 13 4.5Z" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
