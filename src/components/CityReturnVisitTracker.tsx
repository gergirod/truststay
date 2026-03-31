"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface Props {
  citySlug: string;
  cityName: string;
  isUnlocked: boolean;
  hasIntent: boolean;
}

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function CityReturnVisitTracker({
  citySlug,
  cityName,
  isUnlocked,
  hasIntent,
}: Props) {
  useEffect(() => {
    const key = `ts_city_last_visit:${citySlug}`;
    const now = Date.now();
    const previousRaw = localStorage.getItem(key);
    const previous = previousRaw ? Number.parseInt(previousRaw, 10) : NaN;

    if (Number.isFinite(previous) && previous > 0) {
      const elapsed = now - previous;
      if (elapsed > 0 && elapsed <= RETURN_WINDOW_MS) {
        track("city_return_visit_7d", {
          city_slug: citySlug,
          city_name: cityName,
          hours_since_last_visit: Math.round(elapsed / (60 * 60 * 1000)),
          is_unlocked: isUnlocked,
          has_intent: hasIntent,
        });
      }
    }

    localStorage.setItem(key, String(now));
  }, [cityName, citySlug, hasIntent, isUnlocked]);

  return null;
}
