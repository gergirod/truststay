"use client";

import type { StayPurpose, WorkStyle } from "@/types";
import { CityLoadingAnimation } from "@/components/CityLoadingAnimation";

interface Props {
  purpose: StayPurpose;
  workStyle: WorkStyle;
  cityName: string;
}

export function IntentLoadingCard({ cityName }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-dune bg-white shadow-sm">
      <div className="h-[3px] bg-bark" />
      <CityLoadingAnimation cityName={cityName} />
    </div>
  );
}
