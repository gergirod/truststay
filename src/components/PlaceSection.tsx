import type { Place } from "@/types";
import { PlaceCard } from "./PlaceCard";

interface Props {
  title: string;
  subtitle?: string;
  places: Place[];
  emptyMessage?: string;
  freeCount?: number;
  isUnlocked?: boolean;
}

function categoryLabel(category: Place["category"]): string {
  switch (category) {
    case "coworking": return "Coworking space";
    case "cafe": return "Café";
    case "food": return "Restaurant";
    case "gym": return "Gym";
    default: return category;
  }
}

function LockedTeaser({ place }: { place: Place }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-dune bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-bark/70">{place.name}</p>
        <p className="mt-0.5 text-xs text-umber/60">{categoryLabel(place.category)}</p>
      </div>
      <span className="ml-3 flex-shrink-0 rounded-full border border-dune bg-cream px-2.5 py-1 text-xs text-umber/60">
        Locked
      </span>
    </div>
  );
}

export function PlaceSection({
  title,
  subtitle,
  places,
  emptyMessage = "No places found in this area.",
  freeCount,
  isUnlocked = false,
}: Props) {
  const applyLock = !isUnlocked && freeCount !== undefined;
  const freePlaces = applyLock ? places.slice(0, freeCount) : places;
  const lockedPlaces = applyLock ? places.slice(freeCount!) : [];

  return (
    <section>
      <div className="mb-5 border-b border-dune pb-3">
        <h2 className="text-base font-semibold text-bark">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm leading-6 text-umber">{subtitle}</p>
        )}
      </div>

      {places.length === 0 ? (
        <div className="rounded-2xl border border-dune bg-white px-6 py-8 text-center">
          <p className="text-sm text-umber">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {freePlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
          {lockedPlaces.map((place) => (
            <LockedTeaser key={place.id} place={place} />
          ))}
        </div>
      )}
    </section>
  );
}
