"use client";

import { track } from "@/lib/analytics";

interface Props {
  slug: string;
  label: string;
  category: string;
}

export function DestinationPill({ slug, label, category }: Props) {
  return (
    <a
      href={`/city/${slug}`}
      onClick={() =>
        track("destination_clicked", { slug, label, category })
      }
      className="flex-shrink-0 sm:flex-shrink rounded-full border border-dune bg-white px-4 py-2 text-sm font-medium text-bark transition-colors hover:border-coral/50 hover:bg-[#FDF3EF] hover:text-coral"
    >
      {label}
    </a>
  );
}
