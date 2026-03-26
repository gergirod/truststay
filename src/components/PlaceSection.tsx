import type { Place } from "@/types";
import { PlaceCard } from "./PlaceCard";

interface Props {
  title: string;
  subtitle?: string;
  places: Place[];
  emptyMessage?: string;
}

export function PlaceSection({
  title,
  subtitle,
  places,
  emptyMessage = "No places found in this area.",
}: Props) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>
        )}
      </div>

      {places.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-8 text-center">
          <p className="text-sm text-stone-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </section>
  );
}
