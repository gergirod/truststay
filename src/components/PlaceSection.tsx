import type { Place } from "@/types";
import { PlaceCard } from "./PlaceCard";

interface Props {
  title: string;
  subtitle?: string;
  places: Place[];
  emptyMessage?: string;
  // Free/locked split — omit both to show all places (default, Task 03 behavior).
  // When both are provided: show freeCount items freely, lock the rest.
  freeCount?: number;
  isUnlocked?: boolean;
}

export function PlaceSection({
  title,
  subtitle,
  places,
  emptyMessage = "No places found in this area.",
  freeCount,
  isUnlocked = false,
}: Props) {
  const applyLock =
    !isUnlocked && freeCount !== undefined && places.length > freeCount;
  const visiblePlaces = applyLock ? places.slice(0, freeCount) : places;
  const lockedCount = applyLock ? places.length - freeCount! : 0;

  return (
    <section>
      <div className="mb-5 border-b border-stone-200 pb-3">
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm leading-6 text-stone-500">{subtitle}</p>
        )}
      </div>

      {places.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-8 text-center">
          <p className="text-sm text-stone-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}

          {lockedCount > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-stone-100" />
              <p className="text-xs text-stone-500">
                +{lockedCount} more &middot; unlock with City Pass
              </p>
              <div className="h-px flex-1 bg-stone-100" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
