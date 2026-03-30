CREATE TYPE "public"."activity" AS ENUM('surf', 'dive', 'hike', 'yoga', 'kite', 'work_first', 'exploring');--> statement-breakpoint
CREATE TYPE "public"."daily_balance" AS ENUM('purpose_first', 'balanced', 'work_first');--> statement-breakpoint
CREATE TYPE "public"."micro_area_status" AS ENUM('candidate', 'active', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."place_category" AS ENUM('coworking', 'cafe', 'food', 'gym', 'other');--> statement-breakpoint
CREATE TYPE "public"."refresh_job_status" AS ENUM('queued', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."refresh_job_type" AS ENUM('volatile_metrics', 'structural_zones', 'destination_backfill', 'manual_refresh');--> statement-breakpoint
CREATE TYPE "public"."refresh_scope_type" AS ENUM('global', 'destination', 'micro_area');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('light', 'balanced', 'heavy');--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"anchor_lat" double precision,
	"anchor_lon" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "micro_area_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"micro_area_id" uuid NOT NULL,
	"alias_name" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"source" text,
	"confidence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "micro_area_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"micro_area_id" uuid NOT NULL,
	"activity" "activity" NOT NULL,
	"work_mode" "work_mode" NOT NULL,
	"daily_balance" "daily_balance" NOT NULL,
	"scores" jsonb NOT NULL,
	"final_score" double precision,
	"rank" integer,
	"evidence_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "micro_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"center_lat" double precision NOT NULL,
	"center_lon" double precision NOT NULL,
	"radius_km" double precision NOT NULL,
	"status" "micro_area_status" DEFAULT 'candidate' NOT NULL,
	"confidence" integer,
	"source" text,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"rating" double precision,
	"review_count" integer,
	"opening_hours_json" jsonb,
	"price_level" text,
	"editorial_summary" text,
	"source" text,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"external_place_id" text,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category" "place_category" DEFAULT 'other' NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"address" text,
	"google_maps_uri" text,
	"website_uri" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" "refresh_job_type" NOT NULL,
	"scope_type" "refresh_scope_type" NOT NULL,
	"destination_id" uuid,
	"micro_area_id" uuid,
	"status" "refresh_job_status" DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "micro_area_aliases" ADD CONSTRAINT "micro_area_aliases_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_area_aliases" ADD CONSTRAINT "micro_area_aliases_micro_area_id_micro_areas_id_fk" FOREIGN KEY ("micro_area_id") REFERENCES "public"."micro_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_area_snapshots" ADD CONSTRAINT "micro_area_snapshots_micro_area_id_micro_areas_id_fk" FOREIGN KEY ("micro_area_id") REFERENCES "public"."micro_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "micro_areas" ADD CONSTRAINT "micro_areas_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_metrics" ADD CONSTRAINT "place_metrics_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_jobs" ADD CONSTRAINT "refresh_jobs_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_jobs" ADD CONSTRAINT "refresh_jobs_micro_area_id_micro_areas_id_fk" FOREIGN KEY ("micro_area_id") REFERENCES "public"."micro_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_unique" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "micro_area_aliases_destination_alias_unique" ON "micro_area_aliases" USING btree ("destination_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "micro_area_aliases_micro_area_idx" ON "micro_area_aliases" USING btree ("micro_area_id");--> statement-breakpoint
CREATE INDEX "micro_area_snapshots_micro_area_idx" ON "micro_area_snapshots" USING btree ("micro_area_id");--> statement-breakpoint
CREATE INDEX "micro_area_snapshots_created_idx" ON "micro_area_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "micro_areas_destination_name_unique" ON "micro_areas" USING btree ("destination_id","canonical_name");--> statement-breakpoint
CREATE UNIQUE INDEX "micro_areas_destination_slug_unique" ON "micro_areas" USING btree ("destination_id","slug");--> statement-breakpoint
CREATE INDEX "micro_areas_destination_idx" ON "micro_areas" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_metrics_place_unique" ON "place_metrics" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "place_metrics_refreshed_idx" ON "place_metrics" USING btree ("refreshed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "places_destination_external_id_unique" ON "places" USING btree ("destination_id","external_place_id");--> statement-breakpoint
CREATE INDEX "places_destination_name_idx" ON "places" USING btree ("destination_id","normalized_name");--> statement-breakpoint
CREATE INDEX "refresh_jobs_status_created_idx" ON "refresh_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "refresh_jobs_destination_idx" ON "refresh_jobs" USING btree ("destination_id");