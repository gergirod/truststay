import type { Place } from "@/types";
import { PlaceCard } from "./PlaceCard";
import { SuggestPlace } from "./SuggestPlace";

type SectionKind = "work" | "food" | "wellbeing";

interface Props {
  title: string;
  subtitle?: string;
  places: Place[];
  emptyMessage?: string;
  freeCount?: number;
  isUnlocked?: boolean;
  citySlug?: string;
  neighborhoodSlug?: string;
  sectionKind?: SectionKind;
}

/** Readable work-fit tier — shown instead of place name to prevent free lookup */
function tierLabel(place: Place): string {
  if (place.category === "coworking") return "Dedicated coworking";
  if (place.category === "cafe") {
    const wf = place.confidence.workFit;
    if (wf === "high") return "High work fit café";
    if (wf === "medium") return "Work-friendly café";
    return "Café";
  }
  if (place.category === "food") return "Coffee & meals spot";
  if (place.category === "gym") return "Wellbeing spot";
  return "Place";
}

function LockedTeaser({ place }: { place: Place }) {
  const dist = place.distanceFromBasekm;
  const tier = tierLabel(place);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-dune bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-bark">{tier}</p>
        {dist !== undefined && (
          <p className="mt-0.5 text-xs text-umber">{dist} km from base</p>
        )}
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
  citySlug = "",
  neighborhoodSlug = "",
  sectionKind,
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
            <div key={place.id} id={`place-${place.id}`}>
              <PlaceCard place={place} isUnlocked={isUnlocked} citySlug={citySlug} />
            </div>
          ))}
          {lockedPlaces.map((place) => (
            <LockedTeaser key={place.id} place={place} />
          ))}
        </div>
      )}

      {isUnlocked && sectionKind && (
        <SuggestPlace
          citySlug={citySlug}
          neighborhoodSlug={neighborhoodSlug}
          sectionCategory={sectionKind}
        />
      )}
    </section>
  );
}
