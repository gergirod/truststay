CREATE TYPE "public"."connectivity_bucket" AS ENUM('excellent', 'good', 'okay', 'risky');--> statement-breakpoint
CREATE TYPE "public"."confidence_bucket" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."source_confidence" AS ENUM('official', 'derived', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."starlink_status" AS ENUM('available', 'capacity_constrained', 'unknown', 'not_available');--> statement-breakpoint

CREATE TABLE "connectivity_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"micro_area_id" uuid,
	"cell_key" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"download_mbps" double precision,
	"upload_mbps" double precision,
	"latency_ms" double precision,
	"source_name" text NOT NULL,
	"source_version" text,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "connectivity_cells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"micro_area_id" uuid,
	"cell_key" text NOT NULL,
	"geojson" jsonb NOT NULL,
	"centroid_lat" double precision NOT NULL,
	"centroid_lon" double precision NOT NULL,
	"median_download_mbps" double precision,
	"median_upload_mbps" double precision,
	"median_latency_ms" double precision,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"freshness_days" integer,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"confidence_bucket" "confidence_bucket" DEFAULT 'low' NOT NULL,
	"remote_work_score" integer DEFAULT 0 NOT NULL,
	"remote_work_bucket" "connectivity_bucket" DEFAULT 'risky' NOT NULL,
	"source_name" text NOT NULL,
	"source_version" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "area_connectivity_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"area_id" text NOT NULL,
	"best_cell_id" uuid,
	"summary" jsonb NOT NULL,
	"starlink_fallback" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "connectivity_observations" ADD CONSTRAINT "connectivity_observations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectivity_observations" ADD CONSTRAINT "connectivity_observations_micro_area_id_micro_areas_id_fk" FOREIGN KEY ("micro_area_id") REFERENCES "public"."micro_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectivity_cells" ADD CONSTRAINT "connectivity_cells_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectivity_cells" ADD CONSTRAINT "connectivity_cells_micro_area_id_micro_areas_id_fk" FOREIGN KEY ("micro_area_id") REFERENCES "public"."micro_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_connectivity_profiles" ADD CONSTRAINT "area_connectivity_profiles_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_connectivity_profiles" ADD CONSTRAINT "area_connectivity_profiles_best_cell_id_connectivity_cells_id_fk" FOREIGN KEY ("best_cell_id") REFERENCES "public"."connectivity_cells"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "connectivity_observations_destination_observed_idx" ON "connectivity_observations" USING btree ("destination_id","observed_at");--> statement-breakpoint
CREATE INDEX "connectivity_observations_destination_cell_idx" ON "connectivity_observations" USING btree ("destination_id","cell_key");--> statement-breakpoint
CREATE UNIQUE INDEX "connectivity_cells_destination_cell_unique" ON "connectivity_cells" USING btree ("destination_id","cell_key");--> statement-breakpoint
CREATE INDEX "connectivity_cells_destination_bucket_idx" ON "connectivity_cells" USING btree ("destination_id","remote_work_bucket");--> statement-breakpoint
CREATE INDEX "connectivity_cells_destination_centroid_idx" ON "connectivity_cells" USING btree ("destination_id","centroid_lat","centroid_lon");--> statement-breakpoint
CREATE UNIQUE INDEX "area_connectivity_profiles_destination_area_unique" ON "area_connectivity_profiles" USING btree ("destination_id","area_id");--> statement-breakpoint
CREATE INDEX "area_connectivity_profiles_destination_idx" ON "area_connectivity_profiles" USING btree ("destination_id");
