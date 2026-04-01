import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  destinations,
  microAreaAliases,
  microAreas,
  microAreaSnapshots,
  placeMetrics,
  places,
  refreshJobs,
  type Destination,
  type MicroArea,
  type MicroAreaAlias,
  type NewDestination,
  type NewMicroArea,
  type NewMicroAreaAlias,
  type NewMicroAreaSnapshot,
  type NewPlace,
  type NewPlaceMetric,
  type NewRefreshJob,
  type Place,
  type PlaceMetric,
  type RefreshJob,
} from "@/db/schema";

export interface CanonicalDestinationContext {
  destination: Destination;
  microAreas: Array<{
    area: MicroArea;
    aliases: MicroAreaAlias[];
  }>;
  placeFreshness: {
    totalPlaces: number;
    placesWithMetrics: number;
    oldestMetricRefreshedAt: string | null;
    newestMetricRefreshedAt: string | null;
  };
}

function normalizeAlias(alias: string): string {
  return alias.toLowerCase().replace(/\s+/g, " ").trim();
}

export class CanonicalRepository {
  async getDestinationBySlug(slug: string): Promise<Destination | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertDestination(input: NewDestination): Promise<Destination | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(destinations)
      .values(input)
      .onConflictDoUpdate({
        target: destinations.slug,
        set: {
          name: input.name,
          country: input.country,
          anchorLat: input.anchorLat ?? null,
          anchorLon: input.anchorLon ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async listMicroAreasForDestination(destinationId: string): Promise<MicroArea[]> {
    const db = getDb();
    if (!db) return [];
    return db
      .select()
      .from(microAreas)
      .where(eq(microAreas.destinationId, destinationId))
      .orderBy(microAreas.canonicalName);
  }

  async listPlaceAnchorsForDestination(
    destinationId: string,
  ): Promise<Array<{ lat: number; lon: number }>> {
    const db = getDb();
    if (!db) return [];
    const rows = await db
      .select({ lat: places.lat, lon: places.lon })
      .from(places)
      .where(eq(places.destinationId, destinationId));
    return rows
      .filter(
        (r): r is { lat: number; lon: number } =>
          typeof r.lat === "number" &&
          Number.isFinite(r.lat) &&
          typeof r.lon === "number" &&
          Number.isFinite(r.lon),
      )
      .map((r) => ({ lat: r.lat, lon: r.lon }));
  }

  async upsertMicroArea(input: NewMicroArea): Promise<MicroArea | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(microAreas)
      .values(input)
      .onConflictDoUpdate({
        target: [microAreas.destinationId, microAreas.canonicalName],
        set: {
          slug: input.slug,
          centerLat: input.centerLat,
          centerLon: input.centerLon,
          radiusKm: input.radiusKm,
          status: input.status ?? "candidate",
          confidence: input.confidence ?? null,
          source: input.source ?? null,
          lastVerifiedAt: input.lastVerifiedAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async upsertMicroAreaAlias(input: NewMicroAreaAlias): Promise<MicroAreaAlias | null> {
    const db = getDb();
    if (!db) return null;
    const normalized = normalizeAlias(input.aliasName);
    const rows = await db
      .insert(microAreaAliases)
      .values({
        ...input,
        normalizedAlias: normalized,
      })
      .onConflictDoUpdate({
        target: [microAreaAliases.destinationId, microAreaAliases.normalizedAlias],
        set: {
          microAreaId: input.microAreaId,
          aliasName: input.aliasName,
          source: input.source ?? null,
          confidence: input.confidence ?? null,
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async resolveMicroAreaAlias(
    destinationId: string,
    aliasName: string,
  ): Promise<MicroArea | null> {
    const db = getDb();
    if (!db) return null;
    const normalized = normalizeAlias(aliasName);
    const alias = await db
      .select()
      .from(microAreaAliases)
      .where(
        and(
          eq(microAreaAliases.destinationId, destinationId),
          eq(microAreaAliases.normalizedAlias, normalized),
        ),
      )
      .limit(1);
    if (!alias[0]) return null;

    const areas = await db
      .select()
      .from(microAreas)
      .where(eq(microAreas.id, alias[0].microAreaId))
      .limit(1);
    return areas[0] ?? null;
  }

  async insertPlace(input: NewPlace): Promise<Place | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db.insert(places).values(input).returning();
    return rows[0] ?? null;
  }

  async upsertPlaceByExternalId(input: {
    destinationId: string;
    externalPlaceId: string;
    name: string;
    normalizedName: string;
    category: Place["category"];
    lat?: number | null;
    lon?: number | null;
    address?: string | null;
    websiteUri?: string | null;
    googleMapsUri?: string | null;
  }): Promise<Place | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(places)
      .values({
        destinationId: input.destinationId,
        externalPlaceId: input.externalPlaceId,
        name: input.name,
        normalizedName: input.normalizedName,
        category: input.category,
        lat: input.lat ?? null,
        lon: input.lon ?? null,
        address: input.address ?? null,
        websiteUri: input.websiteUri ?? null,
        googleMapsUri: input.googleMapsUri ?? null,
      })
      .onConflictDoUpdate({
        target: [places.destinationId, places.externalPlaceId],
        set: {
          name: input.name,
          normalizedName: input.normalizedName,
          category: input.category,
          lat: input.lat ?? null,
          lon: input.lon ?? null,
          address: input.address ?? null,
          websiteUri: input.websiteUri ?? null,
          googleMapsUri: input.googleMapsUri ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async upsertPlaceMetric(input: NewPlaceMetric): Promise<PlaceMetric | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(placeMetrics)
      .values(input)
      .onConflictDoUpdate({
        target: placeMetrics.placeId,
        set: {
          rating: input.rating ?? null,
          reviewCount: input.reviewCount ?? null,
          openingHoursJson: input.openingHoursJson ?? null,
          priceLevel: input.priceLevel ?? null,
          editorialSummary: input.editorialSummary ?? null,
          source: input.source ?? null,
          refreshedAt: input.refreshedAt ?? new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async insertMicroAreaSnapshot(
    input: NewMicroAreaSnapshot,
  ): Promise<typeof microAreaSnapshots.$inferSelect | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db.insert(microAreaSnapshots).values(input).returning();
    return rows[0] ?? null;
  }

  async createRefreshJob(input: NewRefreshJob): Promise<RefreshJob | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db.insert(refreshJobs).values(input).returning();
    return rows[0] ?? null;
  }

  async updateRefreshJobStatus(
    id: string,
    status: RefreshJob["status"],
    opts: { error?: string | null; started?: boolean; finished?: boolean } = {},
  ): Promise<RefreshJob | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .update(refreshJobs)
      .set({
        status,
        error: opts.error ?? null,
        startedAt: opts.started ? new Date() : undefined,
        finishedAt: opts.finished ? new Date() : undefined,
      })
      .where(eq(refreshJobs.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async getCanonicalDestinationContext(
    slug: string,
  ): Promise<CanonicalDestinationContext | null> {
    const db = getDb();
    if (!db) return null;

    const destination = await this.getDestinationBySlug(slug);
    if (!destination) return null;

    const areaRows = await db
      .select()
      .from(microAreas)
      .where(
        and(
          eq(microAreas.destinationId, destination.id),
          eq(microAreas.status, "active"),
        ),
      )
      .orderBy(microAreas.canonicalName);

    const aliasRows = await db
      .select()
      .from(microAreaAliases)
      .where(eq(microAreaAliases.destinationId, destination.id));

    const placesRows = await db
      .select()
      .from(places)
      .where(eq(places.destinationId, destination.id));

    const placeIds = placesRows.map((p) => p.id);
    const allMetrics =
      placeIds.length > 0
        ? await db
            .select()
            .from(placeMetrics)
            .where(inArray(placeMetrics.placeId, placeIds))
        : [];

    const refreshedValues = allMetrics
      .map((m) => m.refreshedAt?.toISOString() ?? null)
      .filter((v): v is string => Boolean(v))
      .sort();

    const areaWithAliases = areaRows.map((area) => ({
      area,
      aliases: aliasRows.filter((a) => a.microAreaId === area.id),
    }));

    return {
      destination,
      microAreas: areaWithAliases,
      placeFreshness: {
        totalPlaces: placesRows.length,
        placesWithMetrics: allMetrics.length,
        oldestMetricRefreshedAt: refreshedValues[0] ?? null,
        newestMetricRefreshedAt:
          refreshedValues.length > 0
            ? refreshedValues[refreshedValues.length - 1]
            : null,
      },
    };
  }

  async listRecentRefreshJobs(limit = 25): Promise<RefreshJob[]> {
    const db = getDb();
    if (!db) return [];
    return db
      .select()
      .from(refreshJobs)
      .orderBy(desc(refreshJobs.createdAt))
      .limit(limit);
  }
}

export const canonicalRepository = new CanonicalRepository();

