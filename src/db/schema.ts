import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const activityEnum = pgEnum("activity", [
  "surf",
  "dive",
  "hike",
  "yoga",
  "kite",
  "work_first",
  "exploring",
]);

export const workModeEnum = pgEnum("work_mode", ["light", "balanced", "heavy"]);
export const dailyBalanceEnum = pgEnum("daily_balance", [
  "purpose_first",
  "balanced",
  "work_first",
]);

export const microAreaStatusEnum = pgEnum("micro_area_status", [
  "candidate",
  "active",
  "deprecated",
]);

export const placeCategoryEnum = pgEnum("place_category", [
  "coworking",
  "cafe",
  "food",
  "gym",
  "other",
]);

export const refreshJobTypeEnum = pgEnum("refresh_job_type", [
  "volatile_metrics",
  "structural_zones",
  "destination_backfill",
  "manual_refresh",
]);

export const refreshScopeTypeEnum = pgEnum("refresh_scope_type", [
  "global",
  "destination",
  "micro_area",
]);

export const refreshJobStatusEnum = pgEnum("refresh_job_status", [
  "queued",
  "running",
  "success",
  "failed",
]);

export const connectivityBucketEnum = pgEnum("connectivity_bucket", [
  "excellent",
  "good",
  "okay",
  "risky",
]);

export const confidenceBucketEnum = pgEnum("confidence_bucket", [
  "low",
  "medium",
  "high",
]);

export const starlinkStatusEnum = pgEnum("starlink_status", [
  "available",
  "capacity_constrained",
  "unknown",
  "not_available",
]);

export const sourceConfidenceEnum = pgEnum("source_confidence", [
  "official",
  "derived",
  "unknown",
]);

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    anchorLat: doublePrecision("anchor_lat"),
    anchorLon: doublePrecision("anchor_lon"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("destinations_slug_unique").on(table.slug),
  }),
);

export const microAreas = pgTable(
  "micro_areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    canonicalName: text("canonical_name").notNull(),
    slug: text("slug").notNull(),
    centerLat: doublePrecision("center_lat").notNull(),
    centerLon: doublePrecision("center_lon").notNull(),
    radiusKm: doublePrecision("radius_km").notNull(),
    status: microAreaStatusEnum("status").default("candidate").notNull(),
    confidence: integer("confidence"),
    source: text("source"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    destinationNameUnique: uniqueIndex("micro_areas_destination_name_unique").on(
      table.destinationId,
      table.canonicalName,
    ),
    destinationSlugUnique: uniqueIndex("micro_areas_destination_slug_unique").on(
      table.destinationId,
      table.slug,
    ),
    destinationIdx: index("micro_areas_destination_idx").on(table.destinationId),
  }),
);

export const microAreaAliases = pgTable(
  "micro_area_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    microAreaId: uuid("micro_area_id")
      .notNull()
      .references(() => microAreas.id, { onDelete: "cascade" }),
    aliasName: text("alias_name").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    source: text("source"),
    confidence: integer("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    aliasUnique: uniqueIndex("micro_area_aliases_destination_alias_unique").on(
      table.destinationId,
      table.normalizedAlias,
    ),
    microAreaIdx: index("micro_area_aliases_micro_area_idx").on(table.microAreaId),
  }),
);

export const places = pgTable(
  "places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    externalPlaceId: text("external_place_id"),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    category: placeCategoryEnum("category").default("other").notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    address: text("address"),
    googleMapsUri: text("google_maps_uri"),
    websiteUri: text("website_uri"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    destinationExternalUnique: uniqueIndex(
      "places_destination_external_id_unique",
    ).on(table.destinationId, table.externalPlaceId),
    destinationNameIdx: index("places_destination_name_idx").on(
      table.destinationId,
      table.normalizedName,
    ),
  }),
);

export const placeMetrics = pgTable(
  "place_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    rating: doublePrecision("rating"),
    reviewCount: integer("review_count"),
    openingHoursJson: jsonb("opening_hours_json"),
    priceLevel: text("price_level"),
    editorialSummary: text("editorial_summary"),
    source: text("source"),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    placeUnique: uniqueIndex("place_metrics_place_unique").on(table.placeId),
    refreshedIdx: index("place_metrics_refreshed_idx").on(table.refreshedAt),
  }),
);

export const microAreaSnapshots = pgTable(
  "micro_area_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    microAreaId: uuid("micro_area_id")
      .notNull()
      .references(() => microAreas.id, { onDelete: "cascade" }),
    activity: activityEnum("activity").notNull(),
    workMode: workModeEnum("work_mode").notNull(),
    dailyBalance: dailyBalanceEnum("daily_balance").notNull(),
    scores: jsonb("scores").notNull(),
    finalScore: doublePrecision("final_score"),
    rank: integer("rank"),
    evidenceSummary: jsonb("evidence_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    microAreaIdx: index("micro_area_snapshots_micro_area_idx").on(table.microAreaId),
    createdIdx: index("micro_area_snapshots_created_idx").on(table.createdAt),
  }),
);

export const refreshJobs = pgTable(
  "refresh_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobType: refreshJobTypeEnum("job_type").notNull(),
    scopeType: refreshScopeTypeEnum("scope_type").notNull(),
    destinationId: uuid("destination_id").references(() => destinations.id, {
      onDelete: "set null",
    }),
    microAreaId: uuid("micro_area_id").references(() => microAreas.id, {
      onDelete: "set null",
    }),
    status: refreshJobStatusEnum("status").default("queued").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusCreatedIdx: index("refresh_jobs_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
    destinationIdx: index("refresh_jobs_destination_idx").on(table.destinationId),
  }),
);

export const connectivityObservations = pgTable(
  "connectivity_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    microAreaId: uuid("micro_area_id").references(() => microAreas.id, {
      onDelete: "set null",
    }),
    cellKey: text("cell_key").notNull(),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    downloadMbps: doublePrecision("download_mbps"),
    uploadMbps: doublePrecision("upload_mbps"),
    latencyMs: doublePrecision("latency_ms"),
    sourceName: text("source_name").notNull(),
    sourceVersion: text("source_version"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    destinationObservedIdx: index("connectivity_observations_destination_observed_idx").on(
      table.destinationId,
      table.observedAt,
    ),
    destinationCellIdx: index("connectivity_observations_destination_cell_idx").on(
      table.destinationId,
      table.cellKey,
    ),
  }),
);

export const connectivityCells = pgTable(
  "connectivity_cells",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    microAreaId: uuid("micro_area_id").references(() => microAreas.id, {
      onDelete: "set null",
    }),
    cellKey: text("cell_key").notNull(),
    geojson: jsonb("geojson").notNull(),
    centroidLat: doublePrecision("centroid_lat").notNull(),
    centroidLon: doublePrecision("centroid_lon").notNull(),
    medianDownloadMbps: doublePrecision("median_download_mbps"),
    medianUploadMbps: doublePrecision("median_upload_mbps"),
    medianLatencyMs: doublePrecision("median_latency_ms"),
    sampleCount: integer("sample_count").notNull().default(0),
    freshnessDays: integer("freshness_days"),
    confidenceScore: integer("confidence_score").notNull().default(0),
    confidenceBucket: confidenceBucketEnum("confidence_bucket").notNull().default("low"),
    remoteWorkScore: integer("remote_work_score").notNull().default(0),
    remoteWorkBucket: connectivityBucketEnum("remote_work_bucket").notNull().default("risky"),
    sourceName: text("source_name").notNull(),
    sourceVersion: text("source_version"),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    destinationCellUnique: uniqueIndex("connectivity_cells_destination_cell_unique").on(
      table.destinationId,
      table.cellKey,
    ),
    destinationBucketIdx: index("connectivity_cells_destination_bucket_idx").on(
      table.destinationId,
      table.remoteWorkBucket,
    ),
    destinationCentroidIdx: index("connectivity_cells_destination_centroid_idx").on(
      table.destinationId,
      table.centroidLat,
      table.centroidLon,
    ),
  }),
);

export const areaConnectivityProfiles = pgTable(
  "area_connectivity_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    areaId: text("area_id").notNull(),
    bestCellId: uuid("best_cell_id").references(() => connectivityCells.id, {
      onDelete: "set null",
    }),
    summary: jsonb("summary").notNull(),
    starlinkFallback: jsonb("starlink_fallback"),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    destinationAreaUnique: uniqueIndex("area_connectivity_profiles_destination_area_unique").on(
      table.destinationId,
      table.areaId,
    ),
    destinationIdx: index("area_connectivity_profiles_destination_idx").on(
      table.destinationId,
    ),
  }),
);

export const unlockEntitlements = pgTable(
  "unlock_entitlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    product: text("product").notNull(),
    citySlug: text("city_slug").notNull(),
    bundleCitySlug: text("bundle_city_slug"),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stripeSessionUnique: uniqueIndex("unlock_entitlements_session_unique").on(
      table.stripeSessionId,
    ),
    emailIdx: index("unlock_entitlements_email_idx").on(table.emailNormalized),
    cityIdx: index("unlock_entitlements_city_idx").on(table.citySlug),
  }),
);

export const unlockRestoreTokens = pgTable(
  "unlock_restore_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    emailNormalized: text("email_normalized").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("unlock_restore_tokens_hash_unique").on(table.tokenHash),
    emailIdx: index("unlock_restore_tokens_email_idx").on(table.emailNormalized),
    expiresIdx: index("unlock_restore_tokens_expires_idx").on(table.expiresAt),
  }),
);

export const destinationsRelations = relations(destinations, ({ many }) => ({
  microAreas: many(microAreas),
  places: many(places),
}));

export const microAreasRelations = relations(microAreas, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [microAreas.destinationId],
    references: [destinations.id],
  }),
  aliases: many(microAreaAliases),
  snapshots: many(microAreaSnapshots),
}));

export const microAreaAliasesRelations = relations(
  microAreaAliases,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [microAreaAliases.destinationId],
      references: [destinations.id],
    }),
    microArea: one(microAreas, {
      fields: [microAreaAliases.microAreaId],
      references: [microAreas.id],
    }),
  }),
);

export const placesRelations = relations(places, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [places.destinationId],
    references: [destinations.id],
  }),
  metrics: many(placeMetrics),
}));

export const placeMetricsRelations = relations(placeMetrics, ({ one }) => ({
  place: one(places, {
    fields: [placeMetrics.placeId],
    references: [places.id],
  }),
}));

export const microAreaSnapshotsRelations = relations(
  microAreaSnapshots,
  ({ one }) => ({
    microArea: one(microAreas, {
      fields: [microAreaSnapshots.microAreaId],
      references: [microAreas.id],
    }),
  }),
);

export const refreshJobsRelations = relations(refreshJobs, ({ one }) => ({
  destination: one(destinations, {
    fields: [refreshJobs.destinationId],
    references: [destinations.id],
  }),
  microArea: one(microAreas, {
    fields: [refreshJobs.microAreaId],
    references: [microAreas.id],
  }),
}));

export const connectivityObservationsRelations = relations(
  connectivityObservations,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [connectivityObservations.destinationId],
      references: [destinations.id],
    }),
    microArea: one(microAreas, {
      fields: [connectivityObservations.microAreaId],
      references: [microAreas.id],
    }),
  }),
);

export const connectivityCellsRelations = relations(connectivityCells, ({ one }) => ({
  destination: one(destinations, {
    fields: [connectivityCells.destinationId],
    references: [destinations.id],
  }),
  microArea: one(microAreas, {
    fields: [connectivityCells.microAreaId],
    references: [microAreas.id],
  }),
}));

export const areaConnectivityProfilesRelations = relations(
  areaConnectivityProfiles,
  ({ one }) => ({
    destination: one(destinations, {
      fields: [areaConnectivityProfiles.destinationId],
      references: [destinations.id],
    }),
    bestCell: one(connectivityCells, {
      fields: [areaConnectivityProfiles.bestCellId],
      references: [connectivityCells.id],
    }),
  }),
);

export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;
export type MicroArea = typeof microAreas.$inferSelect;
export type NewMicroArea = typeof microAreas.$inferInsert;
export type MicroAreaAlias = typeof microAreaAliases.$inferSelect;
export type NewMicroAreaAlias = typeof microAreaAliases.$inferInsert;
export type Place = typeof places.$inferSelect;
export type NewPlace = typeof places.$inferInsert;
export type PlaceMetric = typeof placeMetrics.$inferSelect;
export type NewPlaceMetric = typeof placeMetrics.$inferInsert;
export type MicroAreaSnapshot = typeof microAreaSnapshots.$inferSelect;
export type NewMicroAreaSnapshot = typeof microAreaSnapshots.$inferInsert;
export type RefreshJob = typeof refreshJobs.$inferSelect;
export type NewRefreshJob = typeof refreshJobs.$inferInsert;
export type ConnectivityObservation = typeof connectivityObservations.$inferSelect;
export type NewConnectivityObservation = typeof connectivityObservations.$inferInsert;
export type ConnectivityCell = typeof connectivityCells.$inferSelect;
export type NewConnectivityCell = typeof connectivityCells.$inferInsert;
export type AreaConnectivityProfile = typeof areaConnectivityProfiles.$inferSelect;
export type NewAreaConnectivityProfile = typeof areaConnectivityProfiles.$inferInsert;
export type UnlockEntitlement = typeof unlockEntitlements.$inferSelect;
export type NewUnlockEntitlement = typeof unlockEntitlements.$inferInsert;
export type UnlockRestoreToken = typeof unlockRestoreTokens.$inferSelect;
export type NewUnlockRestoreToken = typeof unlockRestoreTokens.$inferInsert;

