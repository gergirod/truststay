"use client";

import { useEffect, useState, type ReactNode } from "react";

interface Props {
  mapContent: ReactNode;
  listContent: ReactNode;
}

export function CityTopTabs({ mapContent, listContent }: Props) {
  const [mode, setMode] = useState<"map" | "list">("map");

  useEffect(() => {
    if (mode !== "map") return;
    const ev = new Event("resize");
    window.setTimeout(() => window.dispatchEvent(ev), 0);
  }, [mode]);

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center rounded-full border border-dune bg-white p-0.5">
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            mode === "map" ? "bg-bark text-white" : "text-umber"
          }`}
        >
          Map view
        </button>
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            mode === "list" ? "bg-bark text-white" : "text-umber"
          }`}
        >
          List view
        </button>
      </div>

      {mode === "map" ? mapContent : listContent}
    </div>
  );
}
