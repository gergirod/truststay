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
  const visiblePlaces =
    applyLock ? places.slice(0, freeCount) : places;
  const lockedCount = applyLock ? places.length - freeCount! : 0;

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
          {visiblePlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}

          {lockedCount > 0 && (
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-5 py-4 text-center">
              <p className="text-sm text-stone-400">
                +{lockedCount} more in this category — unlock with City Pass
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
