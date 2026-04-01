import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  areaConnectivityProfiles,
  connectivityCells,
  connectivityObservations,
  destinations,
  type AreaConnectivityProfile,
  type ConnectivityCell,
  type ConnectivityObservation,
  type NewAreaConnectivityProfile,
  type NewConnectivityCell,
  type NewConnectivityObservation,
} from "@/db/schema";

export interface BboxFilter {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export class ConnectivityRepository {
  async getDestinationBySlug(slug: string) {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  }

  async insertObservation(input: NewConnectivityObservation): Promise<ConnectivityObservation | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db.insert(connectivityObservations).values(input).returning();
    return rows[0] ?? null;
  }

  async listObservationsForDestination(destinationId: string): Promise<ConnectivityObservation[]> {
    const db = getDb();
    if (!db) return [];
    return db
      .select()
      .from(connectivityObservations)
      .where(eq(connectivityObservations.destinationId, destinationId))
      .orderBy(desc(connectivityObservations.observedAt));
  }

  async upsertCell(input: NewConnectivityCell): Promise<ConnectivityCell | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(connectivityCells)
      .values(input)
      .onConflictDoUpdate({
        target: [connectivityCells.destinationId, connectivityCells.cellKey],
        set: {
          microAreaId: input.microAreaId ?? null,
          geojson: input.geojson,
          centroidLat: input.centroidLat,
          centroidLon: input.centroidLon,
          medianDownloadMbps: input.medianDownloadMbps ?? null,
          medianUploadMbps: input.medianUploadMbps ?? null,
          medianLatencyMs: input.medianLatencyMs ?? null,
          sampleCount: input.sampleCount ?? 0,
          freshnessDays: input.freshnessDays ?? null,
          confidenceScore: input.confidenceScore ?? 0,
          confidenceBucket: input.confidenceBucket ?? "low",
          remoteWorkScore: input.remoteWorkScore ?? 0,
          remoteWorkBucket: input.remoteWorkBucket ?? "risky",
          sourceName: input.sourceName,
          sourceVersion: input.sourceVersion ?? null,
          computedAt: input.computedAt ?? new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async listCellsForDestination(
    destinationId: string,
    bbox?: BboxFilter,
  ): Promise<ConnectivityCell[]> {
    const db = getDb();
    if (!db) return [];
    if (!bbox) {
      return db
        .select()
        .from(connectivityCells)
        .where(eq(connectivityCells.destinationId, destinationId))
        .orderBy(desc(connectivityCells.remoteWorkScore));
    }
    return db
      .select()
      .from(connectivityCells)
      .where(
        and(
          eq(connectivityCells.destinationId, destinationId),
          gte(connectivityCells.centroidLat, bbox.minLat),
          lte(connectivityCells.centroidLat, bbox.maxLat),
          gte(connectivityCells.centroidLon, bbox.minLon),
          lte(connectivityCells.centroidLon, bbox.maxLon),
        ),
      )
      .orderBy(desc(connectivityCells.remoteWorkScore));
  }

  async upsertAreaProfile(input: NewAreaConnectivityProfile): Promise<AreaConnectivityProfile | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .insert(areaConnectivityProfiles)
      .values(input)
      .onConflictDoUpdate({
        target: [areaConnectivityProfiles.destinationId, areaConnectivityProfiles.areaId],
        set: {
          bestCellId: input.bestCellId ?? null,
          summary: input.summary,
          starlinkFallback: input.starlinkFallback ?? null,
          computedAt: input.computedAt ?? new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0] ?? null;
  }

  async getAreaProfile(destinationId: string, areaId: string): Promise<AreaConnectivityProfile | null> {
    const db = getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(areaConnectivityProfiles)
      .where(
        and(
          eq(areaConnectivityProfiles.destinationId, destinationId),
          eq(areaConnectivityProfiles.areaId, areaId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getLatestCityProfile(destinationId: string): Promise<AreaConnectivityProfile | null> {
    return this.getAreaProfile(destinationId, "city");
  }

  async countCellsForDestination(destinationId: string): Promise<number> {
    const db = getDb();
    if (!db) return 0;
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectivityCells)
      .where(eq(connectivityCells.destinationId, destinationId))
      .limit(1);
    return rows[0]?.count ?? 0;
  }
}

export const connectivityRepository = new ConnectivityRepository();
